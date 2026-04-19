# Quote Schema V2 — спец

**Дата:** 2026-04-19
**Статус:** Затверджено

## Контекст

QuotLyBot зберігає цитати як `Quote` документи у Mongo. Поточна схема містить лише `file_id` стікера та голосування — без тексту, оригінального автора, посилання на оригінальне повідомлення чи прапорця для голосових. Це блокує:

- Telegram Mini App архів (не можна відрендерити bubble — нема тексту)
- Permalink з OG-preview (нема тексту + немає стабільного ID)
- Seasonal top (є `createdAt`, бракує зручного індексу)
- V3 Hall of Fame (потрібен ground truth автора і opt-in per-quote)

Крім того, `Quote.create` у `handlers/quote.js:1149` викликається **тільки** коли в групи ввімкнений `settings.rate`. У групах без rate цитати не зберігаються взагалі.

## Рішення (V2)

Розширити схему `Quote` мінімально необхідними полями, запровадити дворівневу нумерацію (per-group local + наскрізний global), завжди персистувати цитати (з opt-out командою), залишити існуючі поля без змін для backward-compat.

### `Quote` — нові поля

```js
text: String,                                  // обов'язкове для нових (якщо storeText)
author: {                                      // реальний автор цитованого повідомлення
  telegram_id: { type: Number, index: true },
  first_name: String,
  last_name: String,
  username: String,
},
source: {                                      // deep-link "→ Оригінал"
  chat_id: Number,
  message_id: Number,
  date: Date,
},
local_id: { type: Number },                    // per-group #142
global_id: { type: Number },                   // наскрізна нумерація (Hall of Fame seed)
voice: {                                       // тільки коли цитата з voice/video_note
  duration: Number,
  transcript: String,
},
legacy: { type: Boolean, default: false },     // true для цитат до міграції (нема text/author)
```

**Існуючі поля** (`group`, `user`, `file_id`, `file_unique_id`, `rate`) — без змін. `user` залишається як "хто запустив /q" (quotedBy семантично), перейменування не робимо — дорого і непотрібно.

### Індекси `Quote`

```js
quoteSchema.index({ group: 1, local_id: 1 }, { unique: true, sparse: true })
quoteSchema.index({ global_id: 1 }, { unique: true, sparse: true })
quoteSchema.index({ group: 1, createdAt: -1 })              // seasonal top
quoteSchema.index({ 'author.telegram_id': 1, group: 1 })    // author profile у групі
// existing: { group: 1, 'rate.score': -1 }, { 'rate.votes.vote': 1, 'rate.score': -1 }
```

`sparse: true` для ID-індексів — старі цитати без `local_id`/`global_id` не конфліктують.

### `Group` — нові поля

```js
quoteCounter: { type: Number, default: 0 },      // atomic sequence для local_id
settings: {
  // ...existing
  archive: {
    storeText: { type: Boolean, default: true }, // opt-out для адмінів
  },
}
```

### Нова колекція `Counter`

Один документ, інкрементується атомарно:

```js
// database/models/counter.js
const counterSchema = new Schema({
  _id: String,          // 'quote' зараз; інші seq'и пізніше
  seq: { type: Number, default: 0 },
})
```

Використання:

```js
Counter.findOneAndUpdate(
  { _id: 'quote' },
  { $inc: { seq: 1 } },
  { new: true, upsert: true }
).then(c => c.seq)
```

Чому окремий counter, а не Mongo transactions — `$inc` на одному документі атомарний без replica set / session management, простіше масштабується, дешевше.

## Зміни в `handlers/quote.js`

Локація: те саме місце, де зараз `Quote.create` (≈ стр. 1147-1163).

### Поточна поведінка

```js
if (sendResult && ctx.group && ctx.group.info && (ctx.group.info.settings.rate || flag.rate)) {
  await ctx.db.Quote.create({ group, user, file_id, file_unique_id, rate })
}
```

Цитати зберігаються ТІЛЬКИ коли `rate` enabled.

### Нова поведінка

Розділити "persist quote" і "init rate.votes":

```js
if (sendResult && ctx.group?.info) {
  const group = ctx.group.info
  const storeText = group.settings?.archive?.storeText ?? true
  const rateEnabled = group.settings.rate || flag.rate

  // ground truth автора — reply_to_message.from (те, що процитували)
  const replied = ctx.message.reply_to_message
  const author = replied?.from
  const isVoice = !!(replied?.voice || replied?.video_note)

  const [localId, globalId] = await Promise.all([
    Group.findByIdAndUpdate(
      group._id,
      { $inc: { quoteCounter: 1 } },
      { new: true }
    ).then(g => g.quoteCounter),
    Counter.findOneAndUpdate(
      { _id: 'quote' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).then(c => c.seq),
  ])

  const doc = {
    group, user: ctx.session.userInfo,
    file_id: sendResult.sticker.file_id,
    file_unique_id: sendResult.sticker.file_unique_id,
    local_id: localId,
    global_id: globalId,
  }

  if (storeText) {
    doc.text = extractQuoteText(replied)
    doc.author = pickAuthorFields(author)
    doc.source = {
      chat_id: replied?.chat?.id,
      message_id: replied?.message_id,
      date: replied?.date ? new Date(replied.date * 1000) : undefined,
    }
    if (isVoice && transcript) {
      doc.voice = { duration: replied.voice?.duration || replied.video_note?.duration, transcript }
    }
  }

  if (rateEnabled) {
    doc.rate = {
      votes: [{ name: '👍', vote: [] }, { name: '👎', vote: [] }],
      score: 0,
    }
  }

  await ctx.db.Quote.create(doc)
}
```

Допоміжні (у `utils/`):

- `extractQuoteText(msg)` — text || caption || voice.transcript (вже є в voice-хендлері) || fallback `''`
- `pickAuthorFields(from)` — тільки `telegram_id/first_name/last_name/username`, без лишнього

## Команди для користувачів

### `/qarchive on|off` (group admin)

Перемикач `settings.archive.storeText`. Показує поточний стан, ефект — тільки на майбутні цитати (вже збережений текст не видаляється).

### `/qforget <local_id>` (тільки автор цитати)

М'яке видалення: unset `text`, `author`, `source`, `voice.transcript`, встановити `legacy: true`. Стікер і голоси лишаються. У V3 додамо `archiveStatus: 'removed'` і фільтрацію Hall of Fame.

## Backfill

Не робимо у V2. Існуючі цитати отримують:
- `legacy: true` на міграції (один раз через migration script)
- `local_id` НЕ проставляємо — webapp показує їх без `#ID` тегу (або fallback на `#<mongo _id короткий>`)
- `global_id` НЕ проставляємо

Реколекція тексту через TDLib можлива у V3, якщо метрики покажуть потребу.

## Те, що свідомо НЕ додаємо у V2

- `archiveStatus: 'private'|'pending_public'|'public'|'removed'` — тільки у V3 Hall of Fame. Додамо з default `'private'`.
- `style` snapshot — preview читає поточні group settings. Якщо style-drift стане проблемою (користувачі скаржаться), додамо окремою міграцією.
- `waveform` для voice — генерується клієнтом з audio URL під час рендеру плеєра.
- `media` (photo/video context) — не в дизайні V2 webapp. Додамо разом із медіа-цитатами.
- Перейменування `user` → `quotedBy` — косметика, непотрібне, масова зміна.

## Критерії успіху V2-схеми

1. Нова цитата з `/q` на текстове повідомлення → в БД є `text`, `author`, `source`, `local_id`, `global_id`.
2. Нова цитата з `/q` на voice → додатково `voice.transcript`, `voice.duration`.
3. Адмін може вимкнути зберігання тексту одним `/qarchive off` → нові цитати лишаються з порожнім `text`.
4. `local_id` інкрементується атомарно (два `/q` одночасно → різні ID в групі).
5. Старі цитати помічені `legacy: true`, не ламають запити webapp.
6. Webapp може зробити запит `{ group, local_id: 142 }` і знайти цитату унікально.

## Non-goals у цьому спеку

- Сам webapp (окремий репо `quotly-webapp`, окремий спец)
- Permalink-сторінки (V2 пізніше, після webapp MVP)
- Migration admin UI (одноразовий скрипт достатньо)
- Публічний Hall of Fame (V3)
- Style editor з live-preview (V2+ окремо)

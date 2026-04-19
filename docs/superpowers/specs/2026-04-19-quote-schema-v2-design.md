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

### Ключове архітектурне рішення: payload-as-is

У `handlers/quote.js:492-826` вже збирається масив `quoteMessages` — це точний payload, який POST-ається у quote-api на `/generate.webp`. Його форма (`messages: [...]` + `backgroundColor`, `emojiBrand`, `scale`, `type`, `width`, `height`) вже підтримує все: кілька повідомлень від різних авторів, media (photo/sticker/video/voice), entities, forward-лейбли, reply-ланцюжки, streaks, privacy-хеші імен, sender tags, partial quotes.

Зберігаємо **цей самий payload** у `Quote.payload`. Плюси:

- Zero-conversion рендер у webapp: бере `payload`, POST-ить у quote-api → получає ту саму .webp, що юзер бачив у чаті.
- Автоматично сумісно з усім, що quote-api вже вміє — не треба переписувати при кожному новому типі медіа.
- Якщо quote-api еволюціонує — payload-и старих цитат треба версіонувати одним полем, а не мігрувати десятки субполів.
- Webapp клієнтський bubble (React-компонент з дизайну) читає ту саму структуру — одне джерело правди про форму цитати.

Поруч із payload — **денормалізовані поля** для дешевого запиту/пошуку у webapp (щоб не парсити payload.messages на кожен запит).

### `Quote` — нові поля

```js
// Точний payload для quote-api (може бути перерендерений 1:1)
payload: {
  version: { type: Number, default: 1 },         // для майбутніх міграцій
  messages: [Schema.Types.Mixed],                // масив як у ctx→quoteApi
  backgroundColor: String,
  emojiBrand: String,
  scale: Number,
  width: Number,
  height: Number,
  type: String,                                  // 'quote' | 'image' | 'png' | 'stories'
  format: String,                                // 'webp' для type=quote
},

// Денормалізовані поля (з payload.messages, для швидких запитів)
text: String,                                    // join усіх .text повідомлень через "\n\n"
authors: [{                                      // унікальні автори всіх повідомлень у цитаті
  telegram_id: { type: Number, index: true },
  first_name: String,
  last_name: String,
  username: String,
  name: String,                                  // готове ім'я для fallback-рендеру
}],
hasVoice: { type: Boolean, default: false },    // 🎤 badge filter
hasMedia: { type: Boolean, default: false },    // photo/video/sticker присутні
messageCount: Number,                            // 1..N — для списків

// Посилання на оригінал у чаті (deep-link "→ Оригінал")
source: {
  chat_id: Number,                               // chat, де було процитовано
  message_ids: [Number],                         // усі message_id, які потрапили у цитату
  date: Date,                                    // дата першого повідомлення
},

// IDs
local_id: { type: Number },                      // per-group #142
global_id: { type: Number },                     // наскрізна нумерація (Hall of Fame seed)

// Прапорці
// legacy: не зберігаємо як поле, дивись розділ "Legacy як virtual" нижче
```

**Існуючі поля** (`group`, `user`, `file_id`, `file_unique_id`, `rate`) — без змін. `user` залишається як "хто запустив /q" (quotedBy семантично), перейменування не робимо — дорого і непотрібно.

**Subdoc hygiene:** для `authors[]`, `payload.messages[]` додати `{ _id: false }` на схемах — інакше Mongoose присвоює ObjectId кожному елементу, це сотні байт зайвого на цитату × мільйони цитат.

### Чому і payload, і денормалізація

- `payload` = ground truth, завжди відображає ту саму цитату, що бот згенерував.
- `text`, `authors`, `hasVoice`, `hasMedia` = **read-optimized**. Mongo не буде парсити `payload.messages[*].text` на індексі — зайве навантаження. Денормалізація робиться **раз при збереженні** і ніколи не оновлюється (цитата immutable).
- Якщо денормалізовані поля розходяться з payload — ground truth це payload, денорм можна перебудувати скриптом.

### Індекси `Quote` (на 77М документах — обережно)

Використовуємо `partialFilterExpression` (вужчі, менші за sparse), будуємо `background: true` по одному, моніторимо навантаження.

```js
quoteSchema.index(
  { group: 1, local_id: 1 },
  { unique: true, partialFilterExpression: { local_id: { $exists: true } } }
)
quoteSchema.index(
  { global_id: 1 },
  { unique: true, partialFilterExpression: { global_id: { $exists: true } } }
)
quoteSchema.index(
  { group: 1, createdAt: -1 }                         // seasonal top / new feed
)
quoteSchema.index(
  { 'authors.telegram_id': 1, group: 1 },             // author profile у групі
  { partialFilterExpression: { 'authors.0': { $exists: true } } }
)
// existing: { group: 1, 'rate.score': -1 }, { 'rate.votes.vote': 1, 'rate.score': -1 }
```

**Свідомо НЕ додаємо у V2:**
- `{ group: 1, hasVoice: 1 }` — voice-filter поки що не вимагається; у межах групи простіше відсканувати і відфільтрувати.
- Mongo text index по `text` — 77М документів + rebuild = болюче. Для V2 webapp пошук у межах групи (`{ group: X, text: /query/i }`) прийнятний, бо група має сотні-тисячі цитат. Global search — тільки з Atlas Search/ES у V3.

**Порядок побудови індексів у проді** (після деплою коду):
1. `{ group: 1, createdAt: -1 }` — найвужчий виграш, не unique. Якщо вже є `{group: 1, 'rate.score': -1}` — можливо, планувальник обходиться нею. Спершу `EXPLAIN` на реальних запитах.
2. `{ global_id: 1 }` partial — малий, швидкий (майже нуль старих docs мають global_id).
3. `{ group: 1, local_id: 1 }` partial unique — те саме.
4. `authors.telegram_id` — останнім; може не знадобитись, якщо groups ≤ 10K quotes (сканування дешеве).

Кожен індекс — окремим `createIndexes` з `background: true` у вікні низького навантаження. Логувати до/після `db.stats()`.

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

**Існуючі групи без `quoteCounter`:** `$inc` на неіснуючому полі створює його з `0 + 1 = 1`. Нові цитати в старій групі починають з `#1`. Для користувачів це OK — архів/webapp — нова фіча, старі цитати і так не матимуть `#ID`. Seed-скрипт не потрібен.

**Якщо потім захочеться "продовжити нумерацію від кількості старих цитат"** — це завжди можна зробити post-hoc: `quoteCounter = count(Quote{group, !local_id})` для кожної групи, а `local_id` нових продовжує. Але це ускладнює mental model ("#1 створено сьогодні, але воно номер 4000"). Рекомендовано: не робити.

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

Розділити "persist quote" і "init rate.votes". На момент `Quote.create` у нас вже є `quoteMessages` (зібраний для quote-api виклику на стр. 974) і render-параметри (`backgroundColor`, `emojiBrand`, `scale`, `width`, `height`, `type`, `format`). Просто передаємо їх у документ:

```js
if (sendResult && ctx.group?.info) {
  const group = ctx.group.info
  const storeText = group.settings?.archive?.storeText ?? true
  const rateEnabled = group.settings.rate || flag.rate

  const [localId, globalId] = await Promise.all([
    ctx.db.Group.findByIdAndUpdate(
      group._id,
      { $inc: { quoteCounter: 1 } },
      { new: true }
    ).then(g => g.quoteCounter),
    ctx.db.Counter.findOneAndUpdate(
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
    // payload — ground truth; можна POST-нути в quote-api і отримати той самий .webp
    const payload = {
      version: 1,
      messages: quoteMessages,        // той самий масив, що пішов у /generate.webp
      backgroundColor,
      emojiBrand,
      scale: flag.scale || scale,
      width,
      height,
      type,                           // 'quote' | 'image' | 'png' | 'stories'
      format,                         // 'webp' для type=quote
    }

    // Soft cap: уникаємо 16MB Mongo limit у патологічних випадках
    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') <= 1_000_000) {
      doc.payload = payload

      // Денормалізація для дешевих запитів у webapp
      const denorm = denormalizeQuote(quoteMessages, ctx.message, { privacy: !!flag.privacy })
      doc.text = denorm.text
      doc.authors = denorm.authors
      doc.hasVoice = denorm.hasVoice
      doc.hasMedia = denorm.hasMedia
      doc.messageCount = denorm.messageCount
      doc.source = denorm.source
    } else {
      console.warn('[quote] payload > 1MB, skipping archive fields', { global_id: globalId })
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

Допоміжна функція `utils/denormalize-quote.js`:

```js
// З quoteMessages і вхідного ctx.message витягує read-optimized поля.
// Викликається раз, при збереженні. Ніколи не оновлюється — цитата immutable.
module.exports = function denormalizeQuote(quoteMessages, ctxMessage, { privacy = false } = {}) {
  let hasVoice = false
  let hasMedia = false
  const texts = []

  for (const m of quoteMessages) {
    if (m.voice) hasVoice = true
    if (m.media) hasMedia = true
    if (m.text) texts.push(m.text)
  }

  // Privacy-gated fields
  let authors = []
  let source = { date: ctxMessage.reply_to_message?.date
    ? new Date(ctxMessage.reply_to_message.date * 1000)
    : new Date() }

  if (!privacy) {
    const seen = new Set()
    for (const m of quoteMessages) {
      const from = m.from
      if (from?.id && !seen.has(from.id)) {
        seen.add(from.id)
        authors.push({
          telegram_id: from.id,
          first_name: from.first_name,
          last_name: from.last_name,
          username: from.username,
          name: from.name || [from.first_name, from.last_name].filter(Boolean).join(' ') || from.title,
        })
      }
    }
    source.chat_id = ctxMessage.chat?.id
    source.message_ids = quoteMessages.map(m => m.message_id).filter(Boolean)
  }

  return {
    text: texts.join('\n\n'),
    authors,
    hasVoice,
    hasMedia,
    messageCount: quoteMessages.length,
    source,
  }
}
```

**Важливо:** `payload.messages` — це вже оброблений масив (з privacy-хешами імен, forward-лейблами, ref до media thumbnails). Зберігаємо його **після** всього pre-processing'у, щоб webapp рендер був ідентичний тому, що юзер бачив.

## Privacy-режим — взаємодія зі збереженням

Handler має `flag.privacy` (з `settings.privacy` групи або `settings.privacy` кожного з авторів). У приватному режимі:

- `payload.messages[*].from.id` — уже хешований `hashCode(name)` замість реального `telegram_id` (логіка у `handlers/quote.js:708-725` та `:564-574`).
- Імена — або форварди, або хеші, без username.

**Правила для денормалізації в privacy-режимі:**

- `authors: []` — порожній. НЕ зберігаємо `telegram_id` реальних користувачів у денормі — саме це було б leak.
- `source.chat_id` — НЕ зберігаємо (якщо приватна група → chat_id сам по собі sensitive).
- `text` — зберігаємо (це публічний зміст процитованого повідомлення, вже захешовані імена відсутні у тілі).
- `payload` — зберігаємо як є (він уже безпечний).

Це означає: у privacy-групі webapp покаже цитату без автор-профілю, але з текстом і bubble.

## Legacy як virtual, не як збережене поле

**НЕ зберігаємо** `legacy: Boolean`. Чому: 77М існуючих цитат не мають payload — робити `updateMany({_id: {$exists: true}}, {$set: {legacy: true}})` на 77М = години навантаження, ризик реплікації. Mongoose `default: false` на schema не застосовується до вже існуючих документів при read.

Замість поля — Mongoose virtual:

```js
quoteSchema.virtual('legacy').get(function () {
  return !this.payload
})
```

Webapp і server код читають `quote.legacy` як зазвичай; запити, що хочуть відсіяти legacy — `{ payload: { $exists: true } }`.

## Payload size cap

Mongo doc limit = 16MB. Нормальна цитата < 10KB. Щоб уникнути патологічних випадків (/q на 100 повідомлень з довгими текстами + photo thumbnails):

```js
const payloadJson = JSON.stringify(payload)
if (Buffer.byteLength(payloadJson, 'utf8') > 1_000_000) {  // 1MB soft cap
  // логуємо, зберігаємо документ БЕЗ payload (так само як storeText=false)
  doc.payload = undefined
  doc.text = undefined
  doc.authors = []
  // інші денорм-поля теж undefined
  // quote все одно зберігається — file_id, rate, IDs
}
```

Це безпека-мережа на крайні випадки, не нормальний flow.

## Нотатки про file_id у payload

`payload.messages[*].from.photo`, `media`, `voice.waveform` можуть містити `file_id`, який Telegram періодично ротує (file_unique_id стабільний). Наслідки:

- **Rerender з payload у quote-api** — може не спрацювати через 24h-тижні для деяких медіа. Для V2 webapp re-render не робимо (style editor це V3+).
- **Webapp показ bubble** — не потребує media-file_id; аватар генерується як gradient з `from.id`, media thumbnail ми і так не рендеримо у bubble з дизайну.
- **Для `/quote` детального екрану з voice-плеєром** — потрібен свіжий аудіо file_id. Рішення: не кешуємо у payload; при відкритті webapp — server-side свіжий `getFile` через TDLib. Повільно? Так. Але це runtime-concern, не schema-concern.

**Висновок:** file_id у payload — "best-effort", не гарантія. Webapp має fallback-поведінку. Не блокуючий ризик для V2.

## Команди для користувачів

### `/qarchive on|off` (group admin)

Перемикач `settings.archive.storeText`. Показує поточний стан, ефект — тільки на майбутні цитати (вже збережений текст не видаляється).

### `/qforget <local_id>` (тільки автори цитати)

Якщо цитата має кількох авторів (multi-message quote) — будь-який з них у `authors[]` може запитати forget. Це trade-off: якщо серед них є "випадковий" репліт, він теж зможе — але альтернатива (тільки "перший автор") штучна. Forget — це privacy-хук, і будь-який з авторів має право.

М'яке видалення (не `deleteOne`):

```js
Quote.updateOne({ _id }, {
  $unset: { payload: 1, text: 1, authors: 1, source: 1 },
  $set: { hasVoice: false, hasMedia: false }
})
```

Стикер `file_id`, `rate`, `local_id`, `global_id` лишаються. Цитата стає `legacy` (virtual повертає true). У V3 з `archiveStatus: 'removed'` додамо фільтр у Hall of Fame.

**НЕ робимо `deleteOne`:** голоси інших користувачів, історія, permalink — все це має не ламатися.

## Міграція на 77М існуючих цитат

**Ключовий принцип:** ніяких `updateMany` по всій колекції. Все нове — тільки на write-path для нових документів.

### Що НЕ робимо

- ❌ Проставляти `legacy: true` проходженням по 77М — не потрібно (virtual замість поля).
- ❌ Проставляти `local_id`/`global_id` на старі — не потрібно (partial index їх ігнорує).
- ❌ Бекфіл `text`/`authors` через TDLib — V3+ після метрик.
- ❌ Додавати багато індексів одразу — виснажує реплікацію.

### Що робимо — пофазно

**Фаза 0 (перед деплоєм):**
1. Backup Mongo (або верифікація, що існуючий backup актуальний).
2. `db.currentOp()` перевірка — немає довгих запитів / index builds.
3. Створити колекцію `counters`, вставити `{_id: 'quote', seq: 0}` (upsert).

**Фаза 1 (деплой коду):**
1. Rolling deploy PM2 кластера. Новий handler починає писати нові поля для нових цитат.
2. Після деплою — 2-3 години моніторингу: latency `/q`, Mongo write queue, cluster CPU.
3. Перевірити, що нові цитати справді мають `payload`, `local_id`, `global_id`, і старі не ламаються на read.

**Фаза 2 (індекси, по одному):**
Кожен з таких в окремому вікні (2+ години паузи між):
1. `{ group: 1, createdAt: -1 }` — найпотрібніший, читається багатьма запитами.
2. `{ global_id: 1 }` partial unique.
3. `{ group: 1, local_id: 1 }` partial unique.
4. `authors.telegram_id` — тільки якщо метрики покажуть потребу.

Запускати з `{ background: true }`. Моніторити: replication lag, indexBuilds у `currentOp`.

**Фаза 3 (командна підтримка):**
- `/qarchive on|off` — деплой у handler index.
- `/qforget` — деплой у handler index.

### Критерії успіху міграції

- Latency `/q` до/після: ≤ +5% (новий write-path додає 2 findOneAndUpdate).
- Нуль помилок unique constraint (local_id / global_id).
- Старі цитати читаються без змін у webapp/handlers.
- `db.quotes.stats()` — індекс `group_1_createdAt_-1` використовується у `EXPLAIN` на `new` feed.

### Rollback strategy

Якщо після Фази 1 проявляється проблема:

1. **Revert deploy** — попередня версія handler'а перестає писати нові поля. Існуючі нові-стиль цитати в БД лишаються (доп. optional поля не ламають старий код).
2. **Index drops** (якщо створені і викликають проблему) — `db.quotes.dropIndex('group_1_local_id_1')` тощо. Не видаляти `{ group: 1, 'rate.score': -1 }` — існуючий.
3. **Counter doc** лишається — нешкідливий, тестовий `{_id:'quote', seq: N}`.
4. **Group.quoteCounter** — нешкідливе поле на Group, лишаємо.

Data loss: нуль. Всі нові-стиль цитати мають повний payload і читатимуться коли код поверне підтримку.

### Реколекція тексту для legacy — відкладено

Можливо у V3 через TDLib (бот може запросити `message_id` з `chat_id` якщо ще доступні). Ризик — старі повідомлення видалені/недоступні. Метрика для рішення: "% legacy-цитат, які юзери відкривають у webapp ≥ 3 разів". Якщо < 5% — не робимо.

## Ризики та мітигації (77М scale)

| Ризик | Ймовірність | Мітигація |
|---|---|---|
| Hot-doc lock на `Counter{_id:'quote'}` | низька (~1.5 /q/сек на піку) | Моніторити `db.currentOp()` write wait. Якщо стане bottleneck — замінити на ObjectId-based `global_id` post-hoc або sharded counters. |
| `Group.quoteCounter` lock для дуже активної групи | середня (DevHub UA-тип) | Для однієї групи writes серіалізуються, але це саме те, що нам треба для монотонності. Якщо хот — accept. |
| Payload надто великий → 16MB Mongo limit | дуже низька | 1MB soft cap у handler'і (див. вище). |
| Privacy leak через `authors[]` | середня якщо забути `flag.privacy` check | Явний тест на privacy-режим перед деплоєм. Unit-тест на `denormalizeQuote(msgs, {privacy: true})`. |
| Stale `file_id` у payload → broken re-render | висока з часом | Re-render не в V2. У V3 — refresh через TDLib getFile перед використанням. |
| Index build блокує writes на 77М | середня без background | Всі індекси з `{ background: true }` і тільки у вікні низького навантаження. |
| Rolling deploy — суміш старих/нових worker'ів | низька | Старі worker'и пишуть без нових полів — це OK (backward compat). Нові worker'и читають старі docs — теж OK (optional fields). Тест: штучно запустити старий + новий handler і перевірити обидва запити. |
| `quoteMessages` мутується після/під час write | середня (є post-processing на стр. 828-833 `avatar = false`) | Після post-processing — перед `Quote.create` — зберігаємо. Deep clone не потрібен, але треба перевірити послідовність викликів: post-process → store → send. |

## Те, що свідомо НЕ додаємо у V2

- `archiveStatus: 'private'|'pending_public'|'public'|'removed'` — тільки у V3 Hall of Fame. Додамо з default `'private'`.
- `style` snapshot — preview читає поточні group settings. Якщо style-drift стане проблемою (користувачі скаржаться), додамо окремою міграцією.
- `waveform` для voice — генерується клієнтом з audio URL під час рендеру плеєра.
- `media` (photo/video context) — не в дизайні V2 webapp. Додамо разом із медіа-цитатами.
- Перейменування `user` → `quotedBy` — косметика, непотрібне, масова зміна.

## Критерії успіху V2-схеми

1. Нова цитата з `/q` на текстове повідомлення → в БД є `payload`, `text`, `authors`, `source`, `local_id`, `global_id`.
2. Нова цитата з `/q` на voice → `payload.messages[0].voice = {waveform, duration}` + `hasVoice=true` + `text` містить transcript.
3. Нова multi-message цитата (`/q 5`) → `payload.messages.length === 5`, `authors[]` містить унікальних авторів, `messageCount === 5`.
4. Нова цитата в privacy-режимі → `authors = []`, `source.chat_id` відсутнє, але `payload`/`text` зберігаються.
5. Адмін може вимкнути зберігання одним `/qarchive off` → нові цитати без `payload` (тільки `file_id`, `rate`, IDs).
6. `local_id` інкрементується атомарно (два `/q` одночасно → різні ID в групі).
7. Старі цитати (77М) не ламають запити webapp; `quote.legacy` virtual повертає true.
8. Webapp може зробити запит `{ group, local_id: 142 }` і знайти цитату унікально через partial unique index.
9. `/qforget` не видаляє документ — unset-ить payload/text/authors/source, зберігає стікер і рейт.
10. `POST quote-api/generate.webp` з `{ messages: quote.payload.messages, backgroundColor: ..., scale: ..., ... }` повертає ідентичний .webp тому, що юзер отримав у чаті (re-render fidelity) — для цитат, де file_id ще не застарів.

## Non-goals у цьому спеку

- Сам webapp (окремий репо `quotly-webapp`, окремий спец)
- Permalink-сторінки (V2 пізніше, після webapp MVP)
- Migration admin UI (одноразовий скрипт достатньо)
- Публічний Hall of Fame (V3)
- Style editor з live-preview (V2+ окремо)

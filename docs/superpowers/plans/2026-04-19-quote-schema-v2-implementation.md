# Quote Schema V2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Quote/Group Mongo schemas with payload-as-is + denormalized fields so new quotes carry full re-render context, per-group `#local_id`, and a global `global_id`, plus add `/qarchive` and `/qforget` commands — without touching the 77M legacy documents.

**Architecture:** Schema changes are add-only optional fields. Existing `handlers/quote.js:1147-1163` save path is refactored to always persist a Quote doc (with payload + denorm when opt-in), not only when rate is enabled. Counter and per-Group `quoteCounter` provide atomic monotonic IDs via `$inc`. Legacy quotes remain unchanged; a Mongoose virtual distinguishes them from forgotten ones.

**Tech Stack:** Node.js 22 + Mongoose 8, Telegraf 3.39 with telegraf-i18n, Node built-in `node:test` runner (no new deps).

**Spec:** `docs/superpowers/specs/2026-04-19-quote-schema-v2-design.md`

---

## File Structure

Created:
- `database/models/counter.js` — atomic sequence doc schema
- `utils/denormalize-quote.js` — derive text/authors/source from quoteMessages
- `utils/denormalize-quote.test.js` — unit tests for denormalizer
- `handlers/qarchive.js` — `/qarchive on|off` group admin toggle
- `handlers/qforget.js` — `/qforget #N` author soft-delete
- `docs/runbooks/quote-schema-v2-rollout.md` — production migration runbook

Modified:
- `database/models/quote.js` — add payload, denorm fields, IDs, forgottenAt, indexes, legacy virtual
- `database/models/group.js` — add quoteCounter, settings.archive.storeText
- `database/models/index.js` — register Counter model
- `handlers/quote.js:1147-1163` — refactor save path to use new fields
- `handlers/index.js` — export new handlers
- `handler.js` — register /qarchive, /qforget commands
- `locales/uk.yaml`, `locales/en.yaml` — i18n strings for new commands
- `package.json` — add `"test": "node --test utils/"` script
- `updates-worker.js` — upsert Counter seed doc on worker boot

---

## Task 1: Counter model

**Files:**
- Create: `database/models/counter.js`
- Modify: `database/models/index.js`

- [ ] **Step 1: Create `database/models/counter.js`**

```js
const { Schema } = require('mongoose')

// Single-document atomic sequence used to mint monotonic IDs.
// We currently use { _id: 'quote' } for Quote.global_id.
const counterSchema = new Schema({
  _id: String,
  seq: { type: Number, default: 0 }
}, {
  versionKey: false
})

module.exports = counterSchema
```

- [ ] **Step 2: Register Counter in `database/models/index.js`**

Replace the file with:

```js
module.exports = {
  User: require('./user'),
  Group: require('./group'),
  Quote: require('./quote'),
  Counter: require('./counter'),
  Stats: require('./stats'),
  Adv: require('./adv'),
  Invoice: require('./invoice')
}
```

- [ ] **Step 3: Verify `ctx.db.Counter` resolves**

Run (without starting the bot):

```bash
node -e "const { db } = require('./database'); db.ready.then(() => { console.log(typeof db.Counter === 'function' ? 'ok' : 'fail'); process.exit(0) })"
```

Expected: prints `ok` within 10s. If it hangs on Mongo connect, `Ctrl-C` — we only need the model class resolution, the key check is no import error.

- [ ] **Step 4: Commit**

```bash
git add database/models/counter.js database/models/index.js
git commit -m "feat(db): add Counter model for monotonic sequences"
```

---

## Task 2: Extend Quote schema

**Files:**
- Modify: `database/models/quote.js`

- [ ] **Step 1: Replace `database/models/quote.js` with the extended schema**

```js
const { Schema } = require('mongoose')

// Embedded schema for denormalized authors (no _id overhead × 77M).
const authorSchema = new Schema({
  telegram_id: Number,
  first_name: String,
  last_name: String,
  username: String,
  title: String,
  name: String
}, { _id: false })

// Embedded schema for the quote-api payload — the ground truth we POST to
// /generate.webp. Stored verbatim so webapp / future re-renderers can feed it
// back and get an identical sticker (within file_id expiry caveats).
const payloadSchema = new Schema({
  version: { type: Number, default: 1 },
  messages: [Schema.Types.Mixed],
  backgroundColor: String,
  emojiBrand: String,
  scale: Number,
  width: Number,
  height: Number,
  type: String,
  format: String
}, { _id: false })

const quoteSchema = new Schema({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group'
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  file_id: {
    type: String
  },
  file_unique_id: {
    type: String,
    index: true,
    unique: true,
    required: true
  },
  rate: {
    votes: [{
      type: Object,
      name: String,
      vote: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
      }]
    }],
    score: {
      type: Number
    }
  },

  // V2 additions — all optional, legacy docs keep working.
  payload: payloadSchema,
  text: String,
  authors: [authorSchema],
  hasVoice: { type: Boolean, default: false },
  hasMedia: { type: Boolean, default: false },
  messageCount: Number,
  source: {
    chat_id: Number,
    message_ids: [Number],
    date: Date
  },
  local_id: Number,
  global_id: Number,
  forgottenAt: Date
}, {
  timestamps: true
})

// Distinguishes legacy (never had payload) from forgotten (payload unset
// by /qforget). See spec section "Legacy як virtual".
quoteSchema.virtual('legacy').get(function () {
  return !this.payload && !this.forgottenAt
})

quoteSchema.virtual('forgotten').get(function () {
  return !!this.forgottenAt
})

// Existing indexes — preserved.
quoteSchema.index({ group: 1, 'rate.score': -1 })
quoteSchema.index({ 'rate.votes.vote': 1, 'rate.score': -1 })

// V2 indexes — all partial so they only cover new-style docs.
// Production rollout order is in docs/runbooks/quote-schema-v2-rollout.md —
// these declarations register intent; operators decide when to build them.
quoteSchema.index(
  { group: 1, local_id: 1 },
  { unique: true, partialFilterExpression: { local_id: { $exists: true } } }
)
quoteSchema.index(
  { global_id: 1 },
  { unique: true, partialFilterExpression: { global_id: { $exists: true } } }
)
quoteSchema.index({ group: 1, createdAt: -1 })
quoteSchema.index(
  { 'authors.telegram_id': 1, group: 1 },
  { partialFilterExpression: { 'authors.0': { $exists: true } } }
)

module.exports = quoteSchema
```

- [ ] **Step 2: Verify schema loads without errors**

```bash
node -e "const s = require('./database/models/quote'); console.log(Object.keys(s.paths).sort().join(',')); console.log('virtuals:', Object.keys(s.virtuals).join(','))"
```

Expected output contains `authors`, `forgottenAt`, `global_id`, `local_id`, `payload`, `source.chat_id`, `text`, and virtuals list includes `legacy,forgotten`.

- [ ] **Step 3: Commit**

```bash
git add database/models/quote.js
git commit -m "feat(db): extend Quote schema with payload + denorm fields + IDs"
```

---

## Task 3: Extend Group schema

**Files:**
- Modify: `database/models/group.js`

- [ ] **Step 1: Add `quoteCounter` and `settings.archive` to `database/models/group.js`**

Locate the existing `settings: { ... }` block (lines 14-47) and add `archive` inside it. Also add `quoteCounter` as a top-level field. The full file becomes:

```js
const { Schema } = require('mongoose')

const groupSchema = Schema({
  group_id: {
    type: Number,
    index: true,
    unique: true,
    required: true
  },
  title: String,
  username: String,
  invite_link: String,
  memberCount: Number,
  settings: {
    locale: String,
    quote: {
      backgroundColor: {
        type: String
      },
      emojiSuffix: {
        type: String
      },
      emojiBrand: {
        type: String
      }
    },
    rate: {
      type: Boolean,
      default: true
    },
    hidden: {
      type: Boolean,
      default: true
    },
    privacy: {
      type: Boolean,
      default: false
    },
    randomQuoteGab: {
      type: Number,
      default: 800
    },
    aiMode: {
      type: String,
      default: 'sarcastic'
    },
    archive: {
      storeText: {
        type: Boolean,
        default: true
      }
    }
  },
  stickerSet: {
    name: String,
    create: {
      type: Boolean,
      default: false
    }
  },
  topSet: {
    name: String,
    create: {
      type: Boolean,
      default: false
    },
    lastUpdate: Date,
    stickers: [{
      quote: {
        type: Schema.Types.ObjectId,
        ref: 'Quote'
      },
      fileId: String,
      fileUniqueId: String
    }]
  },
  lastRandomQuote: {
    type: Date,
    default: Date()
  },
  available: {
    check: Boolean,
    active: Boolean
  },
  quoteCounter: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

module.exports = groupSchema
```

- [ ] **Step 2: Verify schema loads**

```bash
node -e "const s = require('./database/models/group'); console.log('archive:', !!s.path('settings.archive.storeText'), 'counter:', !!s.path('quoteCounter'))"
```

Expected: `archive: true counter: true`

- [ ] **Step 3: Commit**

```bash
git add database/models/group.js
git commit -m "feat(db): add quoteCounter and settings.archive to Group"
```

---

## Task 4: Test runner setup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update `package.json` test script**

In `package.json`, replace the `"test"` line under `"scripts"`:

```json
"test": "node --test utils/"
```

- [ ] **Step 2: Verify test runner works on empty directory**

```bash
npm test
```

Expected: exits 0 with `# tests 0` or similar (no test files yet — no failure).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: wire Node built-in test runner for utils/"
```

---

## Task 5: denormalizeQuote helper (TDD)

**Files:**
- Create: `utils/denormalize-quote.js`
- Create: `utils/denormalize-quote.test.js`

- [ ] **Step 1: Write the failing tests**

Create `utils/denormalize-quote.test.js`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const denormalizeQuote = require('./denormalize-quote')

const realUser = (id, first, last, username) => ({
  id, first_name: first, last_name: last, username
})
const channelChat = (id, title) => ({ id, title })
const hashedForward = (id, name) => ({ id, name })
const quotAI = () => ({
  id: 6,
  name: 'QuotAI',
  photo: { url: 'https://example.com/quotai.jpg' }
})

test('real user produces full author entry', () => {
  const msgs = [{ from: realUser(1234567890, 'Дмитро', 'Ш', 'dmshev'), text: 'hi' }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.deepEqual(result.authors[0], {
    telegram_id: 1234567890,
    first_name: 'Дмитро',
    last_name: 'Ш',
    username: 'dmshev',
    title: undefined,
    name: 'Дмитро Ш'
  })
})

test('low-id real user (Durov-like) is included', () => {
  const msgs = [{ from: realUser(1, 'Pavel', null, 'durov'), text: 'hi' }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.authors[0].telegram_id, 1)
  assert.equal(result.authors[0].name, 'Pavel')
})

test('channel sender_chat is included as author with title', () => {
  const msgs = [{ from: channelChat(-1001234, 'Канал X'), text: 'post' }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.authors[0].name, 'Канал X')
  assert.equal(result.authors[0].title, 'Канал X')
})

test('QuotAI synthetic author is included with name only', () => {
  const msgs = [
    { from: realUser(1234567890, 'Дмитро', null, 'dm'), text: 'q' },
    { from: quotAI(), text: 'AI-generated quote text' }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  const names = result.authors.map(a => a.name).sort()
  assert.deepEqual(names, ['Дмитро', 'QuotAI'])
})

test('hashed forward stub is included', () => {
  const msgs = [{ from: hashedForward(98765, 'Anonymous Sender'), text: 'fwd' }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.authors[0].name, 'Anonymous Sender')
  assert.equal(result.authors[0].telegram_id, 98765)
})

test('dedup by id for repeated real users', () => {
  const u = realUser(42, 'Kate', 'R', 'kate')
  const msgs = [
    { from: u, text: 'a' },
    { from: u, text: 'b' },
    { from: u, text: 'c' }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.messageCount, 3)
})

test('dedup by name when id absent', () => {
  const msgs = [
    { from: { name: 'QuotAI' }, text: 'a' },
    { from: { name: 'QuotAI' }, text: 'b' }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
})

test('text joins multi-message with blank line', () => {
  const msgs = [
    { from: realUser(1, 'A', null, null), text: 'one' },
    { from: realUser(2, 'B', null, null), text: 'two' }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.text, 'one\n\ntwo')
})

test('hasVoice and hasMedia flags', () => {
  const msgs = [
    { from: realUser(1, 'A', null, null), voice: { duration: 10 } },
    { from: realUser(2, 'B', null, null), media: [{ file_id: 'x' }] }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.hasVoice, true)
  assert.equal(result.hasMedia, true)
})

test('privacy mode: authors empty, no chat_id, text preserved', () => {
  const msgs = [
    { from: realUser(1234567890, 'Дмитро', 'Ш', 'dmshev'), text: 'secret' }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } }, { privacy: true })
  assert.deepEqual(result.authors, [])
  assert.equal(result.source.chat_id, undefined)
  assert.deepEqual(result.source.message_ids, undefined)
  assert.equal(result.text, 'secret')
})

test('from.name === false (streak non-first) still resolves display name via first_name', () => {
  const msgs = [{
    from: { id: 42, first_name: 'Kate', last_name: 'R', name: false },
    text: 'hi'
  }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.authors[0].name, 'Kate R')
})

test('source.date from reply_to_message.date (unix seconds → Date)', () => {
  const msgs = [{ from: realUser(1, 'A', null, null), text: 'x' }]
  const result = denormalizeQuote(msgs, {
    chat: { id: -100500 },
    reply_to_message: { date: 1745000000 }
  })
  assert.ok(result.source.date instanceof Date)
  assert.equal(result.source.date.getTime(), 1745000000 * 1000)
})

test('source.message_ids collected from quoteMessages', () => {
  const msgs = [
    { from: realUser(1, 'A', null, null), text: 'x', message_id: 101 },
    { from: realUser(2, 'B', null, null), text: 'y', message_id: 102 }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.deepEqual(result.source.message_ids, [101, 102])
})

test('empty quoteMessages returns zero state', () => {
  const result = denormalizeQuote([], { chat: { id: -100500 } })
  assert.deepEqual(result.authors, [])
  assert.equal(result.text, '')
  assert.equal(result.messageCount, 0)
  assert.equal(result.hasVoice, false)
  assert.equal(result.hasMedia, false)
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: all tests fail with `Cannot find module './denormalize-quote'` or similar.

- [ ] **Step 3: Implement `utils/denormalize-quote.js`**

```js
// Derives read-optimized fields from the quoteMessages array that handlers/quote.js
// builds for POSTing to quote-api's /generate.webp. Called once at Quote.create time
// and never updated (quotes are immutable).

// Display-name fallback: handlers/quote.js:659 may assign .name = false to non-first-in-streak
// messages, so we read first_name / title in priority order.
function pickDisplayName (from) {
  if (!from) return null
  if (from.first_name) return [from.first_name, from.last_name].filter(Boolean).join(' ')
  if (from.title) return from.title
  if (typeof from.name === 'string') return from.name
  return null
}

module.exports = function denormalizeQuote (quoteMessages, ctxMessage, { privacy = false } = {}) {
  let hasVoice = false
  let hasMedia = false
  const texts = []

  for (const m of quoteMessages) {
    if (m.voice) hasVoice = true
    if (m.media) hasMedia = true
    if (m.text) texts.push(m.text)
  }

  const authors = []
  const source = {
    date: ctxMessage && ctxMessage.reply_to_message && ctxMessage.reply_to_message.date
      ? new Date(ctxMessage.reply_to_message.date * 1000)
      : new Date()
  }

  if (!privacy) {
    const seen = new Set()
    for (const m of quoteMessages) {
      const from = m.from
      const name = pickDisplayName(from)
      if (!name) continue

      const key = from && from.id != null ? `id:${from.id}` : `name:${name}`
      if (seen.has(key)) continue
      seen.add(key)

      authors.push({
        telegram_id: from ? from.id : undefined,
        first_name: from ? from.first_name : undefined,
        last_name: from ? from.last_name : undefined,
        username: from ? from.username : undefined,
        title: from ? from.title : undefined,
        name
      })
    }
    if (ctxMessage && ctxMessage.chat) source.chat_id = ctxMessage.chat.id
    source.message_ids = quoteMessages.map(m => m.message_id).filter(Boolean)
  }

  return {
    text: texts.join('\n\n'),
    authors,
    hasVoice,
    hasMedia,
    messageCount: quoteMessages.length,
    source
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: `# pass 14` (or whatever final count), `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add utils/denormalize-quote.js utils/denormalize-quote.test.js
git commit -m "feat(utils): add denormalizeQuote for Quote V2 read-optimized fields"
```

---

## Task 6: Refactor Quote.create in handlers/quote.js

**Files:**
- Modify: `handlers/quote.js:1147-1163`

- [ ] **Step 1: Add require at the top of `handlers/quote.js`**

Find the existing requires block (typically first 10-30 lines). Add:

```js
const denormalizeQuote = require('../utils/denormalize-quote')
```

Run `head -30 handlers/quote.js` first to see the exact location; insert after the last existing `require(...)`.

- [ ] **Step 2: Replace the Quote.create block at lines 1147-1163**

Locate the existing block:

```js
if (sendResult && ctx.group && ctx.group.info && (ctx.group.info.settings.rate || flag.rate)) {
  // Use insertOne for better performance than save()
  await ctx.db.Quote.create({
    group: ctx.group.info,
    user: ctx.session.userInfo,
    file_id: sendResult.sticker.file_id,
    file_unique_id: sendResult.sticker.file_unique_id,
    rate: {
      votes: [
        { name: '👍', vote: [] },
        { name: '👎', vote: [] }
      ],
      score: 0
    }
  })
}
```

Replace it with:

```js
if (sendResult && ctx.group && ctx.group.info) {
  const groupInfo = ctx.group.info
  const storeText = groupInfo.settings?.archive?.storeText ?? true
  const rateEnabled = !!(groupInfo.settings.rate || flag.rate)

  let localId, globalId
  try {
    ;[localId, globalId] = await Promise.all([
      ctx.db.Group.findByIdAndUpdate(
        groupInfo._id,
        { $inc: { quoteCounter: 1 } },
        { new: true, projection: { quoteCounter: 1 } }
      ).then(g => g && g.quoteCounter),
      ctx.db.Counter.findOneAndUpdate(
        { _id: 'quote' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, projection: { seq: 1 } }
      ).then(c => c && c.seq)
    ])
  } catch (err) {
    console.error('[quote] ID allocation failed, proceeding without IDs', err)
  }

  const doc = {
    group: groupInfo,
    user: ctx.session.userInfo,
    file_id: sendResult.sticker.file_id,
    file_unique_id: sendResult.sticker.file_unique_id
  }
  if (localId != null) doc.local_id = localId
  if (globalId != null) doc.global_id = globalId

  if (storeText) {
    const payload = {
      version: 1,
      messages: quoteMessages,
      backgroundColor,
      emojiBrand,
      scale: flag.scale || scale,
      width,
      height,
      type,
      format
    }

    const payloadBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8')
    if (payloadBytes <= 1_000_000) {
      doc.payload = payload

      const denorm = denormalizeQuote(quoteMessages, ctx.message, { privacy: !!flag.privacy })
      doc.text = denorm.text
      doc.authors = denorm.authors
      doc.hasVoice = denorm.hasVoice
      doc.hasMedia = denorm.hasMedia
      doc.messageCount = denorm.messageCount
      doc.source = denorm.source
    } else {
      console.warn('[quote] payload exceeds 1MB cap, skipping archive fields', {
        global_id: globalId,
        payloadBytes
      })
    }
  }

  if (rateEnabled) {
    doc.rate = {
      votes: [
        { name: '👍', vote: [] },
        { name: '👎', vote: [] }
      ],
      score: 0
    }
  }

  try {
    await ctx.db.Quote.create(doc)
  } catch (err) {
    console.error('[quote] Quote.create failed', { global_id: globalId }, err)
  }
}
```

- [ ] **Step 3: Sanity-check by parsing the file**

```bash
node --check handlers/quote.js
```

Expected: exits 0 (no syntax errors).

- [ ] **Step 4: Smoke test with lint**

```bash
npx eslint handlers/quote.js
```

Expected: no new errors beyond whatever already existed. If existing errors appear that are unrelated — leave them (not in scope). If new errors from the edit — fix them.

- [ ] **Step 5: Commit**

```bash
git add handlers/quote.js
git commit -m "feat(quote): persist payload + denorm + IDs on every successful /q"
```

---

## Task 7: Seed Counter doc on worker boot

**Files:**
- Modify: `updates-worker.js` (around line 127 where `ctx.db = db` is configured)

- [ ] **Step 1: Locate the bot setup sequence in `updates-worker.js`**

```bash
grep -n "setupBot\|db.ready\|ctx.db = db" updates-worker.js | head -10
```

We want to upsert the Counter seed document once per worker after DB connects.

- [ ] **Step 2: Add a post-connect seed helper**

Find the `setupBot()` method (or wherever `db.ready` is awaited before the bot starts processing). Add this block after `db.ready` resolves and before middleware is mounted:

```js
// One-time seed of the quote counter. Idempotent upsert — safe to run from
// every worker on boot. No-op after the first worker succeeds.
await db.Counter.findOneAndUpdate(
  { _id: 'quote' },
  { $setOnInsert: { seq: 0 } },
  { upsert: true }
).catch(err => {
  console.error('[boot] failed to seed Counter{_id:quote}', err)
})
```

If `db.ready` is not awaited explicitly before bot middleware is registered, wrap the seed inside `db.ready.then(...)` so it runs after the connection is established but doesn't block the event loop.

- [ ] **Step 3: Verify seed logic is idempotent**

```bash
node -e "
const { db } = require('./database')
db.ready.then(async () => {
  await db.Counter.findOneAndUpdate({ _id: 'quote' }, { \$setOnInsert: { seq: 0 } }, { upsert: true })
  const c1 = await db.Counter.findById('quote')
  await db.Counter.findOneAndUpdate({ _id: 'quote' }, { \$setOnInsert: { seq: 0 } }, { upsert: true })
  const c2 = await db.Counter.findById('quote')
  console.log('seq before:', c1.seq, 'seq after second upsert:', c2.seq)
  process.exit(c1.seq === c2.seq ? 0 : 1)
})
"
```

Expected: both values equal (the second upsert did not reset seq). If Mongo isn't reachable in the dev environment, skip this check and test in staging.

- [ ] **Step 4: Commit**

```bash
git add updates-worker.js
git commit -m "feat(boot): seed Counter{_id:'quote'} once per worker startup"
```

---

## Task 8: `/qarchive` command

**Files:**
- Create: `handlers/qarchive.js`
- Modify: `handlers/index.js`
- Modify: `handler.js` (register command)
- Modify: `locales/uk.yaml`, `locales/en.yaml`

- [ ] **Step 1: Add i18n strings to `locales/uk.yaml`**

Append (at the end of the file, before any trailing EOF):

```yaml
qarchive:
  on: "✅ Архівування тексту цитат <b>увімкнено</b>. Нові цитати зберігатимуться з текстом і автором."
  off: "⏸ Архівування тексту цитат <b>вимкнено</b>. Нові цитати зберігатимуть лише стікер і рейтинг."
  status_on: "Поточний стан: <b>увімкнено</b>.\n\n<code>/qarchive off</code> — вимкнути"
  status_off: "Поточний стан: <b>вимкнено</b>.\n\n<code>/qarchive on</code> — увімкнути"
  usage: "Перемикач архіву тексту цитат для цієї групи.\n\n<code>/qarchive on</code> або <code>/qarchive off</code>"
```

- [ ] **Step 2: Add the same keys to `locales/en.yaml`**

```yaml
qarchive:
  on: "✅ Quote text archive <b>enabled</b>. New quotes will be stored with text and author."
  off: "⏸ Quote text archive <b>disabled</b>. New quotes will store only the sticker and rating."
  status_on: "Current state: <b>enabled</b>.\n\n<code>/qarchive off</code> — disable"
  status_off: "Current state: <b>disabled</b>.\n\n<code>/qarchive on</code> — enable"
  usage: "Toggle quote text archive for this group.\n\n<code>/qarchive on</code> or <code>/qarchive off</code>"
```

- [ ] **Step 3: Create `handlers/qarchive.js`**

```js
module.exports = async (ctx) => {
  if (!ctx.group || !ctx.group.info) return

  const parts = (ctx.message.text || '').trim().split(/\s+/).slice(1)
  const arg = (parts[0] || '').toLowerCase()

  const current = ctx.group.info.settings?.archive?.storeText ?? true

  if (arg === 'on' || arg === 'off') {
    const next = arg === 'on'
    await ctx.db.Group.updateOne(
      { _id: ctx.group.info._id },
      { $set: { 'settings.archive.storeText': next } }
    )
    ctx.group.info.settings = ctx.group.info.settings || {}
    ctx.group.info.settings.archive = { storeText: next }
    return ctx.replyWithHTML(ctx.i18n.t(next ? 'qarchive.on' : 'qarchive.off'), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  if (!arg) {
    return ctx.replyWithHTML(ctx.i18n.t(current ? 'qarchive.status_on' : 'qarchive.status_off'), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  return ctx.replyWithHTML(ctx.i18n.t('qarchive.usage'), {
    reply_to_message_id: ctx.message.message_id
  }).catch(() => {})
}
```

- [ ] **Step 4: Export from `handlers/index.js`**

Add the import and export. The full file becomes:

```js
const { handleOnboardingCallback } = require('./onboarding')
const { handleMenuCallback } = require('./menu')

module.exports = {
  handleStart: require('./start'),
  handleHelp: require('./help'),
  handleAdv: require('./adv'),
  handleModerateAdv: require('./adv-moderate'),
  handleQuote: require('./quote'),
  handleGetQuote: require('./get'),
  handleTopQuote: require('./top'),
  handleRandomQuote: require('./random'),
  handleColorQuote: require('./color-settings'),
  handleEmojiBrandQuote: require('./emoji-brand'),
  handleSettingsHidden: require('./hidden-settings'),
  handleGabSettings: require('./gab-settings'),
  handleSave: require('./sticker-save'),
  handleDelete: require('./sticker-delete'),
  handleDeleteRandom: require('./sticker-random-delete'),
  handleRate: require('./rate'),
  handleEmoji: require('./emoji'),
  handleSettingsRate: require('./rate-settings'),
  handlePrivacy: require('./privacy-settings'),
  handleLanguage: require('./language'),
  handleAiMode: require('./ai-mode'),
  handleFstik: require('./fstik'),
  handleSticker: require('./sticker'),
  handleDonate: require('./donate'),
  handlePing: require('./ping'),
  handleChatMember: require('./chat-member'),
  handleInlineQuery: require('./inline-query'),
  handleOnboardingCallback,
  handleMenuCallback,
  handleArchive: require('./qarchive'),
  handleForget: require('./qforget')
}
```

(The `handleForget` export is for Task 9 — adding both here now avoids re-editing this file.)

- [ ] **Step 5: Register `/qarchive` in `handler.js`**

Find the block with `bot.command('qtop', onlyGroup, handleTopQuote)` (around line 213). Add this nearby, grouped with other group-admin commands (after `bot.hears(/^\/(qrate)/, onlyGroup, onlyAdmin, handleSettingsRate)` — around line 257):

```js
bot.command('qarchive', onlyGroup, onlyAdmin, require('./handlers').handleArchive)
```

Also ensure `handleArchive` is imported at the top of `handler.js` alongside other `handle*` imports from `./handlers` — match the existing import style (destructuring from `./handlers`).

- [ ] **Step 6: Lint-check**

```bash
npx eslint handlers/qarchive.js handlers/index.js handler.js
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add handlers/qarchive.js handlers/index.js handler.js locales/uk.yaml locales/en.yaml
git commit -m "feat(command): /qarchive on|off toggles group text archive"
```

---

## Task 9: `/qforget` command

**Files:**
- Create: `handlers/qforget.js`
- Modify: `handler.js` (register command)
- Modify: `locales/uk.yaml`, `locales/en.yaml`

- [ ] **Step 1: Add i18n strings to `locales/uk.yaml`**

```yaml
qforget:
  usage: "Вкажіть номер цитати: <code>/qforget 142</code>"
  not_found: "Цитату #{{local}} не знайдено в цій групі."
  not_author: "Лише автор цитати може її видалити."
  forgotten: "✅ Цитату #{{local}} забуто. Стікер і голоси залишаються, але текст і автор прибрано з архіву."
  already_forgotten: "Цитату #{{local}} вже було забуто."
  not_yet_archived: "Цитата #{{local}} не має тексту (була створена до архіву)."
```

- [ ] **Step 2: Add to `locales/en.yaml`**

```yaml
qforget:
  usage: "Specify the quote number: <code>/qforget 142</code>"
  not_found: "Quote #{{local}} not found in this group."
  not_author: "Only the quote author can forget it."
  forgotten: "✅ Quote #{{local}} forgotten. Sticker and votes remain, but text and author are removed from the archive."
  already_forgotten: "Quote #{{local}} was already forgotten."
  not_yet_archived: "Quote #{{local}} has no text (created before the archive)."
```

- [ ] **Step 3: Create `handlers/qforget.js`**

```js
module.exports = async (ctx) => {
  if (!ctx.group || !ctx.group.info) return

  const match = (ctx.message.text || '').match(/\/qforget(?:@\S+)?\s+#?(\d+)/i)
  if (!match) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.usage'), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  const local = parseInt(match[1], 10)

  const quote = await ctx.db.Quote.findOne({
    group: ctx.group.info._id,
    local_id: local
  }).lean()

  if (!quote) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.not_found', { local }), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  if (quote.forgottenAt) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.already_forgotten', { local }), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  if (!quote.payload) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.not_yet_archived', { local }), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  const requesterId = ctx.from && ctx.from.id
  const isAuthor = Array.isArray(quote.authors) &&
    quote.authors.some(a => a && a.telegram_id === requesterId)

  if (!isAuthor) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.not_author'), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  await ctx.db.Quote.updateOne(
    { _id: quote._id },
    {
      $unset: { payload: 1, text: 1, authors: 1, source: 1 },
      $set: { hasVoice: false, hasMedia: false, forgottenAt: new Date() }
    }
  )

  return ctx.replyWithHTML(ctx.i18n.t('qforget.forgotten', { local }), {
    reply_to_message_id: ctx.message.message_id
  }).catch(() => {})
}
```

- [ ] **Step 4: Register `/qforget` in `handler.js`**

Add next to the `/qarchive` registration from Task 8:

```js
bot.command('qforget', onlyGroup, require('./handlers').handleForget)
```

Note: `/qforget` is **not** `onlyAdmin` — authors (not only admins) must be able to forget their own quote. The handler enforces author-only internally.

- [ ] **Step 5: Lint-check**

```bash
npx eslint handlers/qforget.js handler.js
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add handlers/qforget.js handler.js locales/uk.yaml locales/en.yaml
git commit -m "feat(command): /qforget soft-deletes text/authors for author"
```

---

## Task 10: Rollout runbook

**Files:**
- Create: `docs/runbooks/quote-schema-v2-rollout.md`

- [ ] **Step 1: Create the runbook**

```markdown
# Quote Schema V2 — Production Rollout Runbook

Use this runbook when deploying the Quote Schema V2 feature to production.
Spec: `docs/superpowers/specs/2026-04-19-quote-schema-v2-design.md`

## Pre-flight (T-1 day)

- [ ] Verify Mongo backup is fresh (within 24h).
- [ ] `db.currentOp()` — confirm no long-running ops or index builds.
- [ ] Record baseline: `db.quotes.stats()` size, `db.quotes.getIndexes()` list, p50/p99 latency of `/q` from the last 7 days.
- [ ] Pick a low-traffic window (historically: 02:00–05:00 UA time).

## Phase 0 — Seed Counter

The worker does `findOneAndUpdate({_id:'quote'}, {$setOnInsert:{seq:0}}, {upsert:true})`
on boot. Manual seed is a safety net in case workers haven't rolled yet:

```js
db.counters.updateOne({ _id: 'quote' }, { $setOnInsert: { seq: 0 } }, { upsert: true })
```

## Phase 1 — Code deploy

- [ ] Rolling PM2 restart of workers (`pm2 reload ecosystem.config.js`).
- [ ] Tail logs — watch for `[quote] ID allocation failed` and `[quote] Quote.create failed`.
- [ ] For 2–3 hours: monitor `/q` p50/p99 latency, Mongo write queue depth, worker CPU.
- [ ] Spot-check one new quote:

```js
db.quotes.findOne({ payload: { $exists: true } }, { payload: 1, local_id: 1, global_id: 1, authors: 1 })
```

Confirm fields present. Abort to rollback (revert deploy) if > 1% of new `/q`
events fail archive write.

## Phase 2 — Index build (one at a time)

Wait at least 2 hours between each `createIndex`. Watch `db.currentOp()` for
`indexBuilds` entries. All builds are `background: true` implicitly in Mongo 4.2+,
but still hammer the replica. Cancel (`db.killOp(<opid>)`) if replication lag
exceeds 30s.

1. `{ group: 1, createdAt: -1 }` — feed / seasonal top:

```js
db.quotes.createIndex({ group: 1, createdAt: -1 }, { background: true })
```

2. `{ global_id: 1 }` partial unique:

```js
db.quotes.createIndex(
  { global_id: 1 },
  { unique: true, partialFilterExpression: { global_id: { $exists: true } }, background: true }
)
```

3. `{ group: 1, local_id: 1 }` partial unique:

```js
db.quotes.createIndex(
  { group: 1, local_id: 1 },
  { unique: true, partialFilterExpression: { local_id: { $exists: true } }, background: true }
)
```

4. `{ 'authors.telegram_id': 1, group: 1 }` — ONLY if metrics show it's needed
   (author profile within group is slow):

```js
db.quotes.createIndex(
  { 'authors.telegram_id': 1, group: 1 },
  { partialFilterExpression: { 'authors.0': { $exists: true } }, background: true }
)
```

After each build: `db.quotes.stats({indexDetails: true})` — log index size.

## Phase 3 — Smoke test commands

- [ ] In a test group: `/q` on a text message → verify new doc has payload + IDs.
- [ ] `/q` on a voice message → verify `hasVoice: true`.
- [ ] `/q 3` on a multi-message streak → verify `messageCount: 3` and deduped `authors[]`.
- [ ] `/qarchive off` → next `/q` saves only file_id + IDs, no payload.
- [ ] `/qarchive on` → back to full archive.
- [ ] `/qforget <local_id>` by author → verify payload/text/authors unset, `forgottenAt` set.
- [ ] `/qforget` by non-author → verify refusal.

## Rollback

- **Fast path:** revert deploy. New code stops writing new fields. Existing new-style docs
  remain harmless (extra optional fields). No data loss.
- **Index cleanup (only if needed):**
  ```js
  db.quotes.dropIndex('group_1_local_id_1')
  db.quotes.dropIndex('global_id_1')
  db.quotes.dropIndex('group_1_createdAt_-1')
  ```
- **Do not drop** `{ group: 1, 'rate.score': -1 }` — it existed before V2.
- Counter doc and Group.quoteCounter fields are harmless — leave them.

## Post-rollout (T+7 days)

- [ ] Compare latency baseline vs current — expect ≤ +5%.
- [ ] `db.quotes.count({ payload: { $exists: true } })` — sanity-check new-doc volume.
- [ ] Sample 10 new quotes, POST each `payload` to `quote-api /generate.webp`,
      confirm rendered .webp matches the stored `file_id` bytes (re-render fidelity).
- [ ] Note any unique-constraint violations in logs (should be zero).
```

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/quote-schema-v2-rollout.md
git commit -m "docs(runbook): production rollout procedure for Quote Schema V2"
```

---

## Self-review checklist (after all tasks complete)

- [ ] `npm test` passes (Task 5 tests).
- [ ] `node --check handlers/quote.js` passes.
- [ ] `npx eslint .` shows no new errors beyond pre-existing ones.
- [ ] `git log --oneline` shows 10 focused commits (one per task) + the 3 spec/plan commits.
- [ ] Manual review: every section of `2026-04-19-quote-schema-v2-design.md` has a matching task.
- [ ] No hardcoded `console.log` or debugging leftovers in the committed code.

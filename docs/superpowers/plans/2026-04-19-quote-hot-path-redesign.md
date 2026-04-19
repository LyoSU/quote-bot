# Quote `/q` hot-path redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut `/q` latency by ~200-500ms by parallelizing ID allocation with quote-api generation, sending sticker with deep-link button in one Telegram API call, and deferring Quote/GroupMember persistence via `setImmediate`. Eliminate `userInfo.save()` `VersionError` warnings by switching to targeted `User.updateOne`.

**Architecture:** Two new pure utility files (`utils/build-quote-reply-markup.js`, `utils/persist-quote-artifacts.js`) that take dependencies as args (testable in isolation). `handlers/quote.js` becomes thinner: ID alloc moves to before `fetch`, markup is built once before send, post-send work is fire-and-forget via `setImmediate`. `handler.js` `User.save()` is replaced with targeted `User.updateOne` mirroring the Group fix already applied in `helpers/group-get.js`.

**Tech Stack:** Node 22, Telegraf 3, Mongoose, `node:test` runner (`utils/*.test.js` glob).

**Spec:** `docs/superpowers/specs/2026-04-19-quote-hot-path-redesign.md`

---

## File Structure

**Create:**
- `utils/build-quote-reply-markup.js` — pure function building inline keyboard from primitives
- `utils/build-quote-reply-markup.test.js` — unit tests (4 cases: rate × deep-link)
- `utils/persist-quote-artifacts.js` — pure function (db injected) for fire-and-forget post-quote writes
- `utils/persist-quote-artifacts.test.js` — unit tests with stub db

**Modify:**
- `handlers/quote.js` — refactor hot path: parallelize ID alloc, use new helpers, drop `editMessageReplyMarkup`, wrap persistence in `setImmediate`
- `handler.js` — replace `userInfo.save()` (lines 132-134, 176-178) with `User.updateOne`
- `helpers/user-get.js` — drop in-memory mutations on existing user (let `updateOne` in middleware handle it); keep `new User().save()` for first-time users only

**Note on file location:** New helpers live in `utils/` (not `helpers/`) to align with the existing `node --test 'utils/*.test.js'` runner glob and the existing pure utility `utils/denormalize-quote.js`.

---

## Task 1: Pure helper — `buildQuoteReplyMarkup`

**Files:**
- Create: `utils/build-quote-reply-markup.js`
- Test: `utils/build-quote-reply-markup.test.js`

The helper takes primitives only (no `ctx`, no `i18n`) so the caller in `handlers/quote.js` resolves the deep-link URL and label, and the helper just assembles the keyboard. Returns either a `Markup.inlineKeyboard(...)` payload or `{}` (telegraf accepts `{}` as "no markup").

- [ ] **Step 1.1: Write failing test**

Create `utils/build-quote-reply-markup.test.js`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const buildQuoteReplyMarkup = require('./build-quote-reply-markup')

test('returns {} when neither rate nor deep-link', () => {
  const result = buildQuoteReplyMarkup({})
  assert.deepEqual(result, {})
})

test('returns rate-only keyboard when rateEnabled and no deep-link', () => {
  const result = buildQuoteReplyMarkup({ rateEnabled: true })
  assert.equal(result.reply_markup.inline_keyboard.length, 1)
  assert.equal(result.reply_markup.inline_keyboard[0].length, 2)
  assert.equal(result.reply_markup.inline_keyboard[0][0].callback_data, 'rate:👍')
  assert.equal(result.reply_markup.inline_keyboard[0][1].callback_data, 'rate:👎')
})

test('returns deep-link-only keyboard when only deepLinkUrl', () => {
  const result = buildQuoteReplyMarkup({
    deepLinkUrl: 'https://t.me/testbot/app?startapp=q-abc-1',
    openInAppLabel: 'Open in app'
  })
  assert.equal(result.reply_markup.inline_keyboard.length, 1)
  assert.equal(result.reply_markup.inline_keyboard[0][0].text, 'Open in app')
  assert.equal(result.reply_markup.inline_keyboard[0][0].url, 'https://t.me/testbot/app?startapp=q-abc-1')
})

test('returns both rows when rateEnabled and deepLinkUrl', () => {
  const result = buildQuoteReplyMarkup({
    rateEnabled: true,
    deepLinkUrl: 'https://t.me/testbot/app?startapp=q-abc-1',
    openInAppLabel: 'Open in app'
  })
  assert.equal(result.reply_markup.inline_keyboard.length, 2)
  assert.equal(result.reply_markup.inline_keyboard[0][0].callback_data, 'rate:👍')
  assert.equal(result.reply_markup.inline_keyboard[1][0].url, 'https://t.me/testbot/app?startapp=q-abc-1')
})

test('skips deep-link row if openInAppLabel missing', () => {
  const result = buildQuoteReplyMarkup({
    rateEnabled: true,
    deepLinkUrl: 'https://t.me/testbot/app?startapp=q-abc-1'
    // openInAppLabel intentionally omitted
  })
  assert.equal(result.reply_markup.inline_keyboard.length, 1)
  assert.equal(result.reply_markup.inline_keyboard[0][0].callback_data, 'rate:👍')
})
```

- [ ] **Step 1.2: Run test, expect fail**

Run: `npx node --test utils/build-quote-reply-markup.test.js`
Expected: All 5 tests fail with `Cannot find module './build-quote-reply-markup'`.

- [ ] **Step 1.3: Implement helper**

Create `utils/build-quote-reply-markup.js`:

```js
const Markup = require('telegraf/markup')

// Pure builder for the inline keyboard attached to a /q sticker.
// Caller resolves deepLinkUrl and openInAppLabel — keeps this helper
// free of telegraf ctx / i18n dependencies for testability.
//
// Returns either { reply_markup: { inline_keyboard: [...] } } (passable
// directly to ctx.replyWithSticker as ...options) or {} (no markup).
module.exports = function buildQuoteReplyMarkup ({ rateEnabled, deepLinkUrl, openInAppLabel } = {}) {
  const rows = []

  if (rateEnabled) {
    rows.push([
      Markup.callbackButton('👍', 'rate:👍'),
      Markup.callbackButton('👎', 'rate:👎')
    ])
  }

  if (deepLinkUrl && openInAppLabel) {
    rows.push([
      Markup.urlButton(openInAppLabel, deepLinkUrl)
    ])
  }

  if (rows.length === 0) return {}
  return Markup.inlineKeyboard(rows).extra()
}
```

Note on `.extra()`: telegraf's `Markup.inlineKeyboard(...)` returns a `Markup` instance; `.extra()` produces `{ reply_markup: { inline_keyboard: [...] } }` ready for spreading into send options. Without `.extra()`, the test's `result.reply_markup` would be undefined.

- [ ] **Step 1.4: Run test, expect pass**

Run: `npx node --test utils/build-quote-reply-markup.test.js`
Expected: All 5 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add utils/build-quote-reply-markup.js utils/build-quote-reply-markup.test.js
git commit -m "$(cat <<'EOF'
feat(utils): buildQuoteReplyMarkup — single source of truth for /q keyboard

Pure builder taking primitives (no ctx/i18n) so /q hot path can construct
the keyboard once before sending the sticker, eliminating the
editMessageReplyMarkup roundtrip.
EOF
)"
```

---

## Task 2: Pure helper — `persistQuoteArtifacts`

**Files:**
- Create: `utils/persist-quote-artifacts.js`
- Test: `utils/persist-quote-artifacts.test.js`

Takes pre-built `doc` and `memberTgIds` plus injected `db` (so tests use a stub). Always resolves — never throws back to caller. Logs errors with structured prefix.

- [ ] **Step 2.1: Write failing test**

Create `utils/persist-quote-artifacts.test.js`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const persistQuoteArtifacts = require('./persist-quote-artifacts')

function makeStubDb ({ createImpl, bulkWriteImpl } = {}) {
  const calls = { create: [], bulkWrite: [] }
  return {
    calls,
    Quote: {
      create: async (doc) => {
        calls.create.push(doc)
        if (createImpl) return createImpl(doc)
      }
    },
    GroupMember: {
      bulkWrite: async (ops, opts) => {
        calls.bulkWrite.push({ ops, opts })
        if (bulkWriteImpl) return bulkWriteImpl(ops, opts)
      }
    }
  }
}

test('writes Quote and GroupMember when both inputs present', async () => {
  const db = makeStubDb()
  const doc = { group: 'g1', user: 'u1', file_id: 'f1', file_unique_id: 'fu1', global_id: 42 }
  await persistQuoteArtifacts({ db, doc, groupId: 'g1', memberTgIds: [111, 222] })
  assert.equal(db.calls.create.length, 1)
  assert.equal(db.calls.create[0], doc)
  assert.equal(db.calls.bulkWrite.length, 1)
  assert.equal(db.calls.bulkWrite[0].ops.length, 2)
  assert.equal(db.calls.bulkWrite[0].opts.ordered, false)
  assert.equal(db.calls.bulkWrite[0].ops[0].updateOne.filter.telegram_id, 111)
  assert.equal(db.calls.bulkWrite[0].ops[1].updateOne.filter.telegram_id, 222)
})

test('skips bulkWrite when memberTgIds empty', async () => {
  const db = makeStubDb()
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [] })
  assert.equal(db.calls.create.length, 1)
  assert.equal(db.calls.bulkWrite.length, 0)
})

test('swallows duplicate-key (11000) errors silently', async (t) => {
  const errs = []
  const origError = console.error
  console.error = (...args) => { errs.push(args) }
  t.after(() => { console.error = origError })

  const db = makeStubDb({
    bulkWriteImpl: () => { const e = new Error('dup'); e.code = 11000; throw e }
  })
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [1] })
  assert.equal(errs.length, 0, 'duplicate-key error should not log')
})

test('logs (does not throw) Quote.create errors', async (t) => {
  const errs = []
  const origError = console.error
  console.error = (...args) => { errs.push(args) }
  t.after(() => { console.error = origError })

  const db = makeStubDb({
    createImpl: () => { throw new Error('create boom') }
  })
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x', global_id: 99 }, groupId: 'g1', memberTgIds: [] })
  assert.equal(errs.length, 1)
  assert.match(String(errs[0][0]), /\[quote:persist\] Quote\.create failed/)
})

test('logs non-11000 bulkWrite errors', async (t) => {
  const errs = []
  const origError = console.error
  console.error = (...args) => { errs.push(args) }
  t.after(() => { console.error = origError })

  const db = makeStubDb({
    bulkWriteImpl: () => { throw new Error('bulk boom') }
  })
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [1] })
  assert.equal(errs.length, 1)
  assert.match(String(errs[0][0]), /\[quote:persist\] GroupMember bulkWrite failed/)
})

test('continues to bulkWrite even if Quote.create fails', async (t) => {
  const origError = console.error
  console.error = () => {}
  t.after(() => { console.error = origError })

  const db = makeStubDb({
    createImpl: () => { throw new Error('boom') }
  })
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [1] })
  assert.equal(db.calls.bulkWrite.length, 1, 'bulkWrite should still run')
})
```

- [ ] **Step 2.2: Run test, expect fail**

Run: `npx node --test utils/persist-quote-artifacts.test.js`
Expected: All 6 tests fail with `Cannot find module './persist-quote-artifacts'`.

- [ ] **Step 2.3: Implement helper**

Create `utils/persist-quote-artifacts.js`:

```js
// Fire-and-forget post-quote persistence. Called from handlers/quote.js
// inside setImmediate after the user-visible sticker reply has shipped.
//
// Always resolves — errors are logged with structured prefixes
// ([quote:persist] ...) but never re-thrown. The caller is already
// detached from the request lifecycle.

module.exports = async function persistQuoteArtifacts ({ db, doc, groupId, memberTgIds }) {
  try {
    await db.Quote.create(doc)
  } catch (err) {
    console.error('[quote:persist] Quote.create failed', { global_id: doc && doc.global_id }, err)
  }

  if (memberTgIds && memberTgIds.length > 0) {
    try {
      await db.GroupMember.bulkWrite(
        memberTgIds.map(tgId => ({
          updateOne: {
            filter: { group: groupId, telegram_id: tgId },
            update: { $setOnInsert: { group: groupId, telegram_id: tgId, firstSeenAt: new Date() } },
            upsert: true
          }
        })),
        { ordered: false }
      )
    } catch (err) {
      // Duplicate-key races are expected (concurrent /q from same author in same group).
      if (!err || err.code !== 11000) {
        console.error('[quote:persist] GroupMember bulkWrite failed', err)
      }
    }
  }
}
```

- [ ] **Step 2.4: Run test, expect pass**

Run: `npx node --test utils/persist-quote-artifacts.test.js`
Expected: All 6 tests pass.

- [ ] **Step 2.5: Run full test suite to confirm no regressions**

Run: `npm test`
Expected: All tests in `utils/*.test.js` pass.

- [ ] **Step 2.6: Commit**

```bash
git add utils/persist-quote-artifacts.js utils/persist-quote-artifacts.test.js
git commit -m "$(cat <<'EOF'
feat(utils): persistQuoteArtifacts — fire-and-forget post-/q writes

Extracts Quote.create + GroupMember.bulkWrite from handlers/quote.js
into a pure helper with injected db. Always resolves; errors logged
under [quote:persist] prefix. Used from setImmediate so the worker
is freed once the sticker has been sent to the user.
EOF
)"
```

---

## Task 3: Refactor `handlers/quote.js` hot path

**Files:**
- Modify: `handlers/quote.js` (regions: 990-1025 fetch construction, 1054-1075 markup pre-build, 1076-1305 send + post-send block)

This is the meaty refactor. Three logical changes, applied as one commit:
1. Build `idsPromise` and run it in parallel with `fetch(quote-api)`.
2. Build `replyMarkup` via `buildQuoteReplyMarkup` BEFORE the four send branches; remove the old per-branch `replyMarkup = Markup.inlineKeyboard(...)` block.
3. Replace post-send `editMessageReplyMarkup` block + inline `Quote.create` + inline `GroupMember.bulkWrite` with `setImmediate(persistQuoteArtifacts(...))`.

Add a temporary `[quote:timing]` log to verify the latency win after deploy. Strip after 48h (tracked as a follow-up issue, not in this PR).

- [ ] **Step 3.1: Add new requires at top of `handlers/quote.js`**

Locate the existing requires (around lines 26-28):
```js
const { sendGramadsAd } = require('../helpers/gramads')
const deepLink = require('../helpers/deep-link')
const denormalizeQuote = require('../utils/denormalize-quote')
```

Add right after:
```js
const buildQuoteReplyMarkup = require('../utils/build-quote-reply-markup')
const persistQuoteArtifacts = require('../utils/persist-quote-artifacts')
```

- [ ] **Step 3.2: Hoist ID allocation to run in parallel with `fetch`**

Find the existing `const generate = await fetch(...)` block (currently around lines 992-1025).

**Before** the `const controller = new AbortController()` line, insert:

```js
  // Allocate quote IDs in parallel with the slow webp generation.
  // Counter $incs are ~5-10ms single-doc indexed writes; fetch is 500-2000ms.
  // On counter failure we degrade gracefully — sticker still sends, no deep-link
  // button, no Quote doc (consistent with pre-V2 behaviour for legacy chats).
  const hasGroup = !!(ctx.group && ctx.group.info)
  const idsPromise = hasGroup
    ? Promise.all([
        ctx.db.Group.findByIdAndUpdate(
          ctx.group.info._id,
          { $inc: { quoteCounter: 1 } },
          { new: true, projection: { quoteCounter: 1 } }
        ).then(g => g && g.quoteCounter),
        ctx.db.Counter.findOneAndUpdate(
          { _id: 'quote' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true, projection: { seq: 1 } }
        ).then(c => c && c.seq)
      ]).catch((err) => {
        console.error('[quote] ID allocation failed', err)
        return [null, null]
      })
    : Promise.resolve([null, null])
```

Then change the existing `const generate = await fetch(...)...handleQuoteError` chain to capture the fetch as a promise and await both together. Replace:

```js
  const generate = await fetch(
    `${quoteApiUri}/generate.webp?botToken=${process.env.BOT_TOKEN}`,
    { ... }
  ).then(async (res) => { ... }).catch((error) => handleQuoteError(ctx, error))
```

with:

```js
  const generatePromise = fetch(
    `${quoteApiUri}/generate.webp?botToken=${process.env.BOT_TOKEN}`,
    {
      method: 'POST',
      body: JSON.stringify({
        type,
        format,
        backgroundColor,
        width,
        height,
        scale: flag.scale || scale,
        messages: quoteMessages,
        emojiBrand
      }),
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    }
  ).then(async (res) => {
    clearTimeout(timeoutId)
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`)
      error.response = { body: await res.text() }
      throw error
    }
    return {
      body: Buffer.from(await res.arrayBuffer()),
      headers: {
        'quote-type': res.headers.get('quote-type') || type
      }
    }
  }).catch((error) => handleQuoteError(ctx, error))

  const [generate, [localId, globalId]] = await Promise.all([generatePromise, idsPromise])
```

- [ ] **Step 3.3: Replace the existing pre-send `replyMarkup` block with `buildQuoteReplyMarkup`**

Find (currently around lines 1066-1075):

```js
        let replyMarkup = {}

        if (ctx.group && ctx.group.info && ctx.group.info.settings && (ctx.group.info.settings.rate || flag.rate)) {
          replyMarkup = Markup.inlineKeyboard([
            Markup.callbackButton('👍', 'rate:👍'),
            Markup.callbackButton('👎', 'rate:👎')
          ])
        }
```

Replace with:

```js
        const rateEnabled = !!(ctx.group && ctx.group.info && ctx.group.info.settings && (ctx.group.info.settings.rate || flag.rate))
        const deepLinkUrl = (localId != null && hasGroup && ctx.botInfo && ctx.botInfo.username)
          ? deepLink.forQuote(ctx.botInfo.username, String(ctx.group.info._id), localId)
          : null
        const replyMarkup = buildQuoteReplyMarkup({
          rateEnabled,
          deepLinkUrl,
          openInAppLabel: deepLinkUrl ? ctx.i18n.t('app.open_quote') : null
        })
```

Note: `buildQuoteReplyMarkup` returns `{}` or `{ reply_markup: ... }`. The four `replyWithSticker` branches below currently pass `reply_markup: replyMarkup` — we keep that exact shape for the rate-only and no-keyboard cases. For the new return shape (with `.extra()`), update all four send call-sites in the next step.

- [ ] **Step 3.4: Update the four send-branches to spread `replyMarkup` instead of passing it as `reply_markup`**

`buildQuoteReplyMarkup` now returns either `{}` or `{ reply_markup: { inline_keyboard: [...] } }`. The four send sites currently do:

```js
            ..., reply_markup: replyMarkup, ...
```

Change each occurrence to spread the helper's return:

```js
            ..., ...replyMarkup, ...
```

There are four occurrences in the post-`generate.body` block — find them by searching `reply_markup: replyMarkup` in `handlers/quote.js`. They all live inside the `if (generate.headers['quote-type'] === 'quote')` branch. Update all four.

- [ ] **Step 3.5: Delete the old post-send block (ID alloc + Quote.create + editMessageReplyMarkup + inline GroupMember.bulkWrite)**

Find the block beginning with `if (sendResult && ctx.group && ctx.group.info) {` (currently around line 1168) through its closing brace (around line 1305, just before `// Show onboarding step 2`).

Delete the entire block — including:
- The `[localId, globalId] = await Promise.all([Group.$inc, Counter.$inc])` block (now hoisted above)
- The `const doc = { ... }` build that uses `groupInfo`, payload, denorm
- The `await ctx.db.Quote.create(doc)` call
- The `editMessageReplyMarkup` block
- The `GroupMember.bulkWrite` block

Replace with the new fire-and-forget call:

```js
        if (sendResult && hasGroup) {
          const groupInfo = ctx.group.info
          const storeText = groupInfo.settings?.archive?.storeText ?? true

          const doc = {
            group: groupInfo,
            user: ctx.session.userInfo,
            file_id: sendResult.sticker.file_id,
            file_unique_id: sendResult.sticker.file_unique_id
          }
          if (localId != null) doc.local_id = localId
          if (globalId != null) doc.global_id = globalId

          let denorm = null
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
              denorm = denormalizeQuote(quoteMessages, ctx.message, { privacy: !!flag.privacy })
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

          const quoterTgId = ctx.session.userInfo && ctx.session.userInfo.telegram_id
          const authorTgIds = ((denorm && denorm.authors) || [])
            .map(a => a && a.telegram_id)
            .filter(id => typeof id === 'number' && id > 0)
          const memberTgIds = [...new Set([quoterTgId, ...authorTgIds].filter(id => typeof id === 'number' && id > 0))]

          setImmediate(() => {
            persistQuoteArtifacts({
              db: ctx.db,
              doc,
              groupId: groupInfo._id,
              memberTgIds
            })
          })
        }
```

- [ ] **Step 3.6: Add temporary `[quote:timing]` log**

Right after the `setImmediate(...)` block above, before the `// Show onboarding step 2` comment, add:

```js
        // Temporary perf probe — strip after 48h of stable readings.
        // Tracked in docs/superpowers/specs/2026-04-19-quote-hot-path-redesign.md §5.
        if (sendResult) {
          console.log('[quote:timing]', {
            chat_type: ctx.chat.type,
            had_button: localId != null,
            had_group: hasGroup
          })
        }
```

(Note: a true wall-clock probe needs a `t0 = Date.now()` capture at the top of the handler — leave it minimal here. If we want full timing, we'll add a `t0` at the start of `module.exports = async (ctx, next) => {` and emit `Date.now() - t0` in this log. Keep it minimal for now: presence/absence is enough to confirm the new code path runs.)

- [ ] **Step 3.7: Verify lint passes**

Run: `npx eslint handlers/quote.js`
Expected: No errors. Warnings about line-length or unused vars need to be addressed.

- [ ] **Step 3.8: Verify all utils tests still pass**

Run: `npm test`
Expected: All `utils/*.test.js` pass (denormalize-quote tests + 2 new test files).

- [ ] **Step 3.9: Commit**

```bash
git add handlers/quote.js
git commit -m "$(cat <<'EOF'
perf(quote): parallelize ID alloc, send sticker with button in one call

- Hoist Group/Counter $inc to run concurrently with quote-api fetch
  (counters finish ~10ms, fetch ~1500ms — net zero added latency).
- Build replyMarkup once via buildQuoteReplyMarkup before any send,
  drop the post-send editMessageReplyMarkup roundtrip (-1 Telegram API
  call per quote).
- Wrap Quote.create + GroupMember.bulkWrite in setImmediate via the
  new persistQuoteArtifacts helper — worker returns to the queue as
  soon as the sticker has been sent.
- Add temporary [quote:timing] log to verify the latency win in prod.

Spec: docs/superpowers/specs/2026-04-19-quote-hot-path-redesign.md
EOF
)"
```

---

## Task 4: Replace `userInfo.save()` with targeted `User.updateOne`

**Files:**
- Modify: `helpers/user-get.js` — drop in-memory mutations on existing user (only `new User().save()` for first-time users remains)
- Modify: `handler.js:131-148` and `:174-178` — replace `userInfo.save()` with `User.updateOne`

The root cause of `[session] userInfo.save failed: VersionError` warnings is full-doc mongoose `save()` racing with concurrent updates of the same user from a parallel worker. The fix is identical to what was done for Group: never call `.save()` on a session-cached doc; use targeted `updateOne` for the small set of fields this middleware actually mutates.

Audit of mutated fields (from `helpers/user-get.js:19-25`):
- `first_name`, `last_name`, `full_name`, `username`, `updatedAt`
- `status` (only when `ctx.chat.type === 'private'`)

These are all profile fields from `ctx.from` — the `updateOne` is a pure idempotent write of "current Telegram profile state."

- [ ] **Step 4.1: Refactor `helpers/user-get.js` to defer profile updates to middleware**

Replace `helpers/user-get.js` contents with:

```js
// Resolves ctx.session.userInfo for the current user. For brand-new users
// performs an immediate insert (we need the _id for downstream handlers).
// For existing users, profile field syncing (first_name/last_name/etc.) is
// done by handler.js middleware via targeted User.updateOne — never by
// full-doc save() on this cached mongoose doc, which would race with
// concurrent updates from other workers handling parallel updates from
// the same user (VersionError).

module.exports = async ctx => {
  let user

  if (!ctx.session.userInfo) {
    user = await ctx.db.User.findOne({ telegram_id: ctx.from.id })
  } else {
    user = ctx.session.userInfo
  }

  if (!user) {
    const now = Math.floor(new Date().getTime() / 1000)
    user = new ctx.db.User()
    user.telegram_id = ctx.from.id
    user.first_act = now
    user.first_name = ctx.from.first_name
    user.last_name = ctx.from.last_name
    user.full_name = `${ctx.from.first_name}${ctx.from.last_name ? ` ${ctx.from.last_name}` : ''}`
    user.username = ctx.from.username
    if (ctx.chat && ctx.chat.type === 'private') user.status = 'member'
    await user.save()
  }

  ctx.session.userInfo = user

  if (ctx.session.userInfo.settings && ctx.session.userInfo.settings.locale) {
    ctx.i18n.locale(ctx.session.userInfo.settings.locale)
  }

  return true
}
```

- [ ] **Step 4.2: Add `syncUserProfile` helper inline in `handler.js` (or call site directly)**

In `handler.js`, locate the `updateGroupAndUser` middleware (currently lines 125-151).

Replace the middleware body. Old:

```js
const updateGroupAndUser = async (ctx, next) => {
  await Promise.all([getUser(ctx), getGroup(ctx)]);
  await next(ctx);
  if (ctx.state.emptyRequest === false) {
    // Save only if documents were modified
    const savePromises = []
    if (ctx.session.userInfo?.isModified?.()) {
      savePromises.push(ctx.session.userInfo.save().catch((err) => {
        console.warn('[session] userInfo.save failed:', err && err.message)
      }))
    }
    if (ctx.group?.info?.isModified?.()) {
      // quoteCounter is owned by atomic $inc in handlers/quote.js — the in-memory
      // value on this doc can be stale (loaded from session or from before the
      // $inc). Strip it from the save so we never stomp the atomic counter.
      ctx.group.info.unmarkModified('quoteCounter')
      if (ctx.group.info.isModified()) {
        savePromises.push(ctx.group.info.save().catch((err) => {
          console.warn('[session] group.info.save failed:', err && err.message)
        }))
      }
    }
    if (savePromises.length > 0) {
      Promise.all(savePromises).catch(() => {})
    }
  }
};
```

New:

```js
// Snapshot current Telegram profile state — written via targeted updateOne
// (not full-doc save) so concurrent workers handling parallel updates from
// the same user can't race into a VersionError.
const syncUserProfileFields = (ctx) => {
  if (!ctx.from || !ctx.session.userInfo || !ctx.session.userInfo._id) return null
  const $set = {
    first_name: ctx.from.first_name,
    last_name: ctx.from.last_name,
    full_name: `${ctx.from.first_name}${ctx.from.last_name ? ` ${ctx.from.last_name}` : ''}`,
    username: ctx.from.username,
    updatedAt: new Date()
  }
  if (ctx.chat && ctx.chat.type === 'private') $set.status = 'member'
  return ctx.db.User.updateOne({ _id: ctx.session.userInfo._id }, { $set }).catch((err) => {
    console.warn('[session] User.updateOne failed:', err && err.message)
  })
}

const updateGroupAndUser = async (ctx, next) => {
  await Promise.all([getUser(ctx), getGroup(ctx)]);
  await next(ctx);
  if (ctx.state.emptyRequest === false) {
    const savePromises = []
    const profileWrite = syncUserProfileFields(ctx)
    if (profileWrite) savePromises.push(profileWrite)

    // Group: settings/stickerSet may be mutated by handlers via in-memory writes.
    // unmarkModified('quoteCounter') keeps the atomic $inc in handlers/quote.js safe.
    if (ctx.group?.info?.isModified?.()) {
      ctx.group.info.unmarkModified('quoteCounter')
      if (ctx.group.info.isModified()) {
        savePromises.push(ctx.group.info.save().catch((err) => {
          console.warn('[session] group.info.save failed:', err && err.message)
        }))
      }
    }
    if (savePromises.length > 0) {
      Promise.all(savePromises).catch(() => {})
    }
  }
};
```

- [ ] **Step 4.3: Apply same fix to the private-chat middleware**

Locate the second `userInfo.save()` call in `handler.js` (currently lines 174-178, inside the `Composer.privateChat(...)` block):

Old:
```js
    await next(ctx).then(() => {
      if (ctx.session.userInfo?.isModified?.()) {
        ctx.session.userInfo.save().catch((err) => {
          console.warn('[session:pm] userInfo.save failed:', err && err.message)
        })
      }
```

New:
```js
    await next(ctx).then(() => {
      const profileWrite = syncUserProfileFields(ctx)
      if (profileWrite) profileWrite.catch(() => {})
    })
```

(Drop the `if (isModified())` gate — `updateOne` with the same values is idempotent and a fast indexed write; no value in branching.)

- [ ] **Step 4.4: Verify lint passes**

Run: `npx eslint handler.js helpers/user-get.js`
Expected: No errors.

- [ ] **Step 4.5: Verify utils tests still pass (sanity)**

Run: `npm test`
Expected: All pass.

- [ ] **Step 4.6: Commit**

```bash
git add handler.js helpers/user-get.js
git commit -m "$(cat <<'EOF'
fix(session): replace User.save() with targeted updateOne

Full-doc save() of session-cached userInfo races with concurrent workers
processing parallel updates from the same user, producing VersionError
warnings (now visible since the recent console.warn change).

Mirror the fix already applied to Group: a syncUserProfileFields helper
writes only the fields this middleware owns (first_name/last_name/full_name/
username/status/updatedAt) via updateOne. Idempotent, no race.

helpers/user-get.js now only mutates the in-memory doc for first-time
users (where save() is required to get an _id); existing users get their
profile synced via the middleware updateOne.
EOF
)"
```

---

## Task 5: Smoke test on dev bot

**Files:** none (manual verification)

This task is a checklist of what to verify after deploying to dev. Do not skip — automated tests cover the helpers in isolation, but the integration in `handlers/quote.js` is verified only by exercising the live bot.

- [ ] **Step 5.1: Start dev bot**

Run: `node index.js` (or however the dev bot is launched in this environment).
Expected: Bot starts cleanly, no errors in startup logs.

- [ ] **Step 5.2: Smoke — `/q` reply in a group**

In a group chat with a recent message: `/q` reply to that message.

Expected:
- Sticker arrives within ~1-3s.
- Sticker has the "Open in app" button visible **immediately** (no pop-in / no second visual update).
- `[quote:timing]` log emitted in worker stdout: `{ chat_type: 'supergroup' or 'group', had_button: true, had_group: true }`.
- No `[quote] ID allocation failed` errors.
- `Quote` doc appears in Mongo with `local_id`, `global_id`, `payload`, `authors` populated. (Check via mongo shell or any client.)
- `GroupMember` doc(s) appear for both quoter and author.

- [ ] **Step 5.3: Smoke — `/q` in private chat (no group context)**

In a DM with the bot: `/q` (or forward a message + `/q`).

Expected:
- Sticker arrives.
- No deep-link button (no group context → no `localId`).
- `[quote:timing]` log: `{ chat_type: 'private', had_button: false, had_group: false }`.
- No `Quote` doc created (this is correct — quotes only persist in group context per existing behaviour).

- [ ] **Step 5.4: Smoke — `userInfo.save()` warnings gone**

Trigger a few `/q` and other commands as the same user concurrently (open two Telegram clients, fire commands rapidly).

Expected:
- No `[session] userInfo.save failed: VersionError` in logs.
- May see `[session] User.updateOne failed:` if a true error occurs — but `VersionError` should be impossible with `updateOne`.

- [ ] **Step 5.5: Smoke — counter monotonicity preserved**

Run `/q` 5 times in a row in the same group.

Expected:
- Each new `Quote` doc in Mongo has `local_id` exactly one higher than the previous.
- No duplicate `local_id` collisions (this was the bug fixed by the `unmarkModified('quoteCounter')` work earlier today — verify the redesign hasn't reintroduced it).

- [ ] **Step 5.6: Final lint + test sweep**

Run:
```bash
npx eslint .
npm test
```

Expected: Both clean.

- [ ] **Step 5.7: Open PR**

If on a feature branch:
```bash
git push -u origin <branch-name>
gh pr create --title "perf(quote): /q hot-path redesign" --body "$(cat <<'EOF'
## Summary
- Parallelize counter $incs with quote-api fetch (~10ms vs ~1500ms — net zero added latency)
- Send sticker with deep-link button in one Telegram API call (drop editMessageReplyMarkup)
- Defer Quote.create + GroupMember.bulkWrite via setImmediate
- Replace User.save() with targeted updateOne (eliminates VersionError warnings)

Spec: docs/superpowers/specs/2026-04-19-quote-hot-path-redesign.md
Plan: docs/superpowers/plans/2026-04-19-quote-hot-path-redesign.md

## Test plan
- [x] utils/build-quote-reply-markup.test.js (5 cases)
- [x] utils/persist-quote-artifacts.test.js (6 cases)
- [x] Smoke: /q in group → sticker with button, no pop-in
- [x] Smoke: /q in private → sticker, no errors
- [x] Smoke: 5 sequential /q → local_id monotonic, no duplicates
- [x] No [session] userInfo.save failed warnings under concurrent load
EOF
)"
```

---

## Follow-ups (NOT in this PR)

- Strip `[quote:timing]` log after 48h of stable readings (file as a small chore).
- If any other handler still does `ctx.session.userInfo.save()` directly (grep for it), apply the same `syncUserProfileFields` pattern.
- Consider compressing `payload` field if Mongo doc size becomes a problem at scale (mentioned in spec out-of-scope).

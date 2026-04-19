# Quote `/q` hot-path redesign

**Date:** 2026-04-19
**Author:** Yuri Ly
**Status:** Approved for planning

## Problem

After Quote Schema V2 + GroupMember + deep-link landed today (25 commits), `/q` handler grew an extra ~200-500ms tail per request. User reports the bot feels slower; also suspects `userInfo.save()` is failing more often.

Root cause analysis (see conversation transcript) identified:

1. `handlers/quote.js:1266` — `await editMessageReplyMarkup` runs after `replyWithSticker`. Extra Telegram API call per quote (2 calls instead of 1), plus rate-limit pressure.
2. `handlers/quote.js:1288` — `await GroupMember.bulkWrite` blocks response despite `// Fire-and-forget` comment. Extra Mongo roundtrip with upsert across 2 indexes.
3. `Quote.create` payload grew from ~200B to 10-100KB — write itself is fine but lives on the critical path.
4. `userInfo.save()` warnings (formerly silent `.catch(() => {})`) became visible after `handler.js:131` switched to `console.warn`. Likely pre-existing `VersionError` from full-doc mongoose saves racing with concurrent updates.

## Goals

- Cut `/q` latency back to pre-V2 levels (~−200-500ms).
- Drop one Telegram API call per quote (2 → 1) to ease rate-limit pressure.
- Single failure point in the hot path (sticker send), not two.
- Make post-send work explicitly async with structured error logs.
- Eliminate `userInfo.save()` `VersionError` warnings at the source, not by silencing.

## Non-goals

- Background job queue (BullMQ/Redis worker). Overkill for two deferred operations; revisit if post-quote work grows past ~5 jobs or needs retry/scheduling.
- Changes to Quote Schema V2 or its indexes — they are correct, just expensive on the critical path.
- Changes to deep-link URL format or webapp contract.
- Onboarding flow (`showOnboardingStep2`) — leave as-is.

## Design

### 1. Pre-allocate IDs in parallel with quote-api generation

Counter `$inc`s are ~5-10ms single-doc indexed writes. The webp generation `fetch` is 500-2000ms. Today they run sequentially (generate → send → counters). They are independent — run them concurrently.

```js
const generatePromise = fetch(`${quoteApiUri}/generate.webp?...`, { ... })

let idsPromise = Promise.resolve([null, null])
if (ctx.group && ctx.group.info) {
  idsPromise = Promise.all([
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
    return [null, null]  // graceful — sticker still sends, just no deep-link button
  })
}

const [generate, [localId, globalId]] = await Promise.all([generatePromise, idsPromise])
```

Counter allocation now finishes long before webp comes back. Effective latency for ID allocation: zero.

**Failure mode:** if either counter `$inc` throws, both fall back to `null`. Sticker still sends, just without the "Open in app" button. Consistent with current behaviour when `editMessageReplyMarkup` fails today (silent).

### 2. Build `replyMarkup` once, send sticker with button already attached

Replace the post-send `editMessageReplyMarkup` block with a single keyboard built before any send. All four sticker-send branches (`flag.privacy` × `tempStickerSet` matrix) take the same `reply_markup` argument.

```js
const buildReplyMarkup = ({ rateEnabled, localId, groupId, ctx }) => {
  const rows = []
  if (rateEnabled) {
    rows.push([
      Markup.callbackButton('👍', 'rate:👍'),
      Markup.callbackButton('👎', 'rate:👎')
    ])
  }
  if (localId != null && groupId && ctx.botInfo && ctx.botInfo.username) {
    rows.push([
      Markup.urlButton(
        ctx.i18n.t('app.open_quote'),
        deepLink.forQuote(ctx.botInfo.username, String(groupId), localId)
      )
    ])
  }
  return rows.length > 0 ? Markup.inlineKeyboard(rows) : {}
}
```

`editMessageReplyMarkup` block (current `handlers/quote.js:1247-1277`) deleted entirely.

**Net effect:** 2 Telegram API calls per quote → 1. ~150ms saved + half the rate-limit cost.

### 3. Extract post-send persistence into `persistQuoteArtifacts()`

New helper file `helpers/persist-quote-artifacts.js`. Pure function over plain inputs (no `ctx` dependency — easier to test).

```js
// helpers/persist-quote-artifacts.js
//
// Writes the Quote doc and tracks group membership. Called via setImmediate
// from the /q handler — never on the critical path of user-visible response.
// All errors are logged but never re-thrown; caller already returned to user.

module.exports = async function persistQuoteArtifacts ({
  db,
  doc,           // pre-built Quote doc with payload, denorm, IDs
  groupId,       // ObjectId
  memberTgIds    // number[] — quoter + author tg ids
}) {
  try {
    await db.Quote.create(doc)
  } catch (err) {
    console.error('[quote:persist] Quote.create failed', { global_id: doc.global_id }, err)
  }

  if (memberTgIds.length > 0) {
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
      if (!err || err.code !== 11000) {
        console.error('[quote:persist] GroupMember bulkWrite failed', err)
      }
    }
  }
}
```

Call site in `handlers/quote.js`:

```js
// After successful sticker send, build doc + invoke fire-and-forget.
const doc = buildQuoteDoc({ groupInfo, ctx, sendResult, localId, globalId, payload, denorm, rateEnabled })
const memberTgIds = collectMemberTgIds({ ctx, denorm })

setImmediate(() => {
  persistQuoteArtifacts({ db: ctx.db, doc, groupId: groupInfo._id, memberTgIds })
})
```

`setImmediate` (vs bare `.catch()`) ensures the function returns to telegraf's middleware chain immediately — the worker is freed to pick up the next update without waiting on Mongo. Errors are caught inside the helper, never propagate.

**Doc-building helpers** (`buildQuoteDoc`, `collectMemberTgIds`) live alongside or inline; if they grow, factor out. Do not introduce a class.

### 4. Drop full-doc `User.save()` in middleware (eliminate VersionError warnings)

In `handler.js:131-148` and `:174-178`, `ctx.session.userInfo.save()` is called on a mongoose doc that may have been mutated concurrently by another worker handling a parallel update from the same user. This produces `VersionError` warnings — now visible after the recent `console.warn` change.

Mirror the fix already applied to Group (`helpers/group-get.js`, `helpers/top-pack-update.js`): replace full-doc save with a targeted `updateOne` that writes only the fields this middleware actually touches.

Audit which fields `updateGroupAndUser` middleware mutates on `userInfo`. Likely:
- `username`, `first_name`, `last_name`, `full_name`, `language_code` (from `ctx.from`)
- `updatedAt`

Build a `$set` payload, call `User.updateOne({_id}, {$set: ...})`. Drop the in-memory `.save()`.

This also removes the need for `unmarkModified('quoteCounter')` style workarounds for any future User counter fields.

### 5. Diagnostics

Add lightweight timing probes during rollout (remove after 48h of stable readings):

```js
const t0 = Date.now()
// ... existing /q work ...
console.log('[quote:timing]', {
  total: Date.now() - t0,
  generate: tGenerate,
  send: tSend,
  hadButton: localId != null
})
```

Goal: confirm we hit the latency target. Strip after metric is verified.

## Data flow

```
User → /q → handler.js (worker)
              │
              ├── ctx.replyWithChatAction('choose_sticker')
              │
              ├── collect messages (TDLib)
              │
              ├── build quoteMessages
              │
              ├── Promise.all([
              │     fetch(quote-api /generate.webp),     ◄── 500-2000ms
              │     Promise.all([
              │       Group.$inc(quoteCounter),          ◄── 5-10ms (parallel)
              │       Counter.$inc(seq)                  ◄── 5-10ms (parallel)
              │     ])
              │   ])
              │
              ├── replyWithSticker(image, {reply_markup with button})  ◄── 1 API call
              │
              ├── setImmediate → persistQuoteArtifacts(doc, members)   ◄── async, fire-and-forget
              │     ├── Quote.create(doc with payload)
              │     └── GroupMember.bulkWrite(upserts)
              │
              └── return — worker freed for next update
```

## Failure modes

| Failure | Today | After redesign |
|---------|-------|----------------|
| Counter `$inc` fails | Sticker sent, `[quote] ID allocation failed` log, then editMessageReplyMarkup fails silently | Same, but no second API call attempted |
| Telegram `replyWithSticker` fails | `handleQuoteError` flow | Unchanged |
| `editMessageReplyMarkup` fails | `console.warn`, sticker has no button | N/A — call removed |
| `Quote.create` fails | Hot path returns to user OK, error logged | Same, error logged in `[quote:persist]` namespace |
| `GroupMember.bulkWrite` fails | `await` blocks user response, then error logged | Caught inside helper, no user impact |
| `User.updateOne` fails | N/A (today: `userInfo.save()` `VersionError`) | Logged, no retry — User doc converges next request |

## Migration / rollout

Single PR. No schema changes. No data migration. Behaviour-compatible:

- Quotes created with `localId` get the "Open in app" button — same as today.
- Quotes created without `localId` (counter failure or no group context) get no button — same as today.
- Existing Quote/GroupMember docs untouched.

Deploy steps:

1. Merge PR.
2. `pm2 reload` (cluster mode rolling restart picks up new workers).
3. Watch `[quote:timing]` logs for 1 hour. Expect `total` median ~600-1500ms (was ~1200-2000ms).
4. Watch `[session] userInfo.save failed` log frequency drops to zero after `User.updateOne` deploy.
5. Strip `[quote:timing]` logs after 48h.

## Testing

- **Unit:** `helpers/persist-quote-artifacts.js` — feed a fake `db` (jest mock or hand-rolled stub), assert it calls `Quote.create` and `GroupMember.bulkWrite` with expected args, swallows duplicate-key errors, logs other errors.
- **Unit:** `buildReplyMarkup` — covers all 4 cases (rate × localId).
- **Smoke:** in dev bot, `/q` reply to a message in group → confirm sticker arrives WITH "Open in app" button in single visual update (no pop-in).
- **Smoke:** `/q` in private chat (no group) → confirm sticker still sends, no errors.
- **Smoke:** force counter failure (e.g. drop Mongo connection mid-request) → confirm sticker still sends without button.
- **Load:** pre-existing harness if any; otherwise visual check on prod traffic.

## Out of scope (follow-ups)

- Migrating `topSet` and other Group sub-trees off `group.save()` — already done in `top-pack-update.js`. Audit other call sites if they exist.
- Adding webp generation timeout adaptive scaling.
- Compressing `payload` field if Mongo doc size becomes a problem at scale.

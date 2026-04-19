# Quote Schema V2 — Production Rollout Runbook

Use this runbook when deploying the Quote Schema V2 feature to production.
Spec: `docs/superpowers/specs/2026-04-19-quote-schema-v2-design.md`
Plan: `docs/superpowers/plans/2026-04-19-quote-schema-v2-implementation.md`

## Pre-flight (T-1 day)

- [ ] Verify Mongo backup is fresh (within 24h).
- [ ] `db.currentOp()` — confirm no long-running ops or index builds.
- [ ] Record baseline: `db.quotes.stats()` size, `db.quotes.getIndexes()` list, p50/p99 latency of `/q` from the last 7 days.
- [ ] Pick a low-traffic window (historically: 02:00–05:00 UA time).
- [ ] Confirm feature branch `feat/quote-schema-v2` passes `npm test` (14 tests).

## Phase 0 — Seed Counter

The worker does `findOneAndUpdate({_id:'quote'}, {$setOnInsert:{seq:0}}, {upsert:true})`
on boot (see `updates-worker.js:setupBot`). Manual seed as a safety net in case
workers haven't rolled yet:

```js
db.counters.updateOne({ _id: 'quote' }, { $setOnInsert: { seq: 0 } }, { upsert: true })
```

## Phase 1 — Code deploy

- [ ] Merge `feat/quote-schema-v2` to `master`.
- [ ] Rolling PM2 restart of workers: `pm2 reload ecosystem.config.js`.
- [ ] Tail logs — watch for `[quote] ID allocation failed` and `[quote] Quote.create failed`.
- [ ] For 2–3 hours: monitor `/q` p50/p99 latency, Mongo write queue depth, worker CPU.
- [ ] Spot-check one new quote:

```js
db.quotes.findOne(
  { payload: { $exists: true } },
  { payload: 1, local_id: 1, global_id: 1, authors: 1, text: 1, hasVoice: 1 }
)
```

Confirm fields present. Abort to rollback (revert merge, redeploy) if > 1% of new
`/q` events fail archive write.

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
     {
       unique: true,
       partialFilterExpression: { global_id: { $exists: true } },
       background: true
     }
   )
   ```

3. `{ group: 1, local_id: 1 }` partial unique:

   ```js
   db.quotes.createIndex(
     { group: 1, local_id: 1 },
     {
       unique: true,
       partialFilterExpression: { local_id: { $exists: true } },
       background: true
     }
   )
   ```

4. `{ 'authors.telegram_id': 1, group: 1 }` — **ONLY if metrics show it's needed**
   (author profile within group is slow):

   ```js
   db.quotes.createIndex(
     { 'authors.telegram_id': 1, group: 1 },
     {
       partialFilterExpression: { 'authors.0': { $exists: true } },
       background: true
     }
   )
   ```

After each build: `db.quotes.stats({indexDetails: true})` — log index size delta.

## Phase 3 — Smoke test commands

Use a test group you control.

- [ ] `/q` on a text message → verify new doc has payload + IDs:
  ```js
  db.quotes.find({ group: ObjectId('...') }).sort({createdAt:-1}).limit(1)
  ```
- [ ] `/q` on a voice message → verify `hasVoice: true` and `payload.messages[0].voice`.
- [ ] `/q 3` on a multi-message streak → verify `messageCount: 3` and deduped `authors[]`.
- [ ] `/qarchive off` → next `/q` saves only file_id + IDs, no `payload` / `text` / `authors`.
- [ ] `/qarchive on` → next `/q` saves full payload again.
- [ ] `/qarchive` (no args) → shows current status.
- [ ] `/qforget <local_id>` as the quote author → verify `payload`/`text`/`authors`/`source`
      unset, `forgottenAt` set, `file_id`/`rate` retained.
- [ ] `/qforget <local_id>` by non-author → verify refusal with "not_author" message.
- [ ] `/qforget 999999` (non-existent) → "not_found" message.
- [ ] `/qforget` on a legacy quote (pre-V2, no `local_id`) → "not_found" (legacy have no local_id).

## Rollback

- **Fast path:** revert the deploy commit on `master`, redeploy. New code stops
  writing V2 fields. Existing new-style docs remain harmless (extra optional fields).
  No data loss.
- **Index cleanup (only if needed):**

  ```js
  db.quotes.dropIndex('group_1_local_id_1')
  db.quotes.dropIndex('global_id_1')
  db.quotes.dropIndex('group_1_createdAt_-1')
  db.quotes.dropIndex('authors.telegram_id_1_group_1')  // if built
  ```

- **Do not drop** `{ group: 1, 'rate.score': -1 }` or `{ 'rate.votes.vote': 1, 'rate.score': -1 }` — they existed before V2.
- Counter doc and `Group.quoteCounter` fields are harmless — leave them.

## Post-rollout (T+7 days)

- [ ] Compare latency baseline vs current — expect ≤ +5%.
- [ ] `db.quotes.countDocuments({ payload: { $exists: true } })` — sanity-check new-doc volume.
- [ ] Sample 10 new quotes, POST each `payload` to `quote-api /generate.webp`,
      confirm re-render matches stored `file_id` bytes (re-render fidelity check).
- [ ] Check logs for unique-constraint violations (should be zero).
- [ ] `db.quotes.stats({indexDetails: true})` — index sizes should be
      proportional to new-doc count, not 77M.

## Notes

- **Privacy mode:** when a group has `settings.privacy` or when `flag.privacy`
  is applied per-quote, `authors[]` stays empty and `source.chat_id` is omitted
  — by design. Verify with a privacy-enabled test group.
- **Counter hot-doc:** `Counter{_id:'quote'}` is a single doc that every /q
  increments. At ~1.5 /q/sec peak this is fine. If `db.currentOp()` starts
  showing write waits on counters, escalate — would need sharded counters
  or ObjectId-based global_id.
- **`file_id` vs `file_unique_id`:** file_id is a stable download handle in
  Bot API / TDLib. `file_unique_id` (already unique-indexed on Quote) is for
  comparison/dedup. Don't swap these in any future code.

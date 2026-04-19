#!/usr/bin/env node

/**
 * One-off backfill: populate GroupMember from existing Quote docs.
 *
 * Iterates all quotes in _id order, extracts (group, telegram_id) pairs from
 * `user` (quoter, requires User lookup) and `authors[]` (V2 only), and upserts
 * them into GroupMember. Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/backfill-group-members.js           # full run
 *   node scripts/backfill-group-members.js --from <ObjectId>   # resume
 *
 * At ~5000 quotes/batch and ~500ms/batch, expect 2-3h for a 77M collection.
 */

require('dotenv').config()
const mongoose = require('mongoose')
const collections = require('../database/models')

const BATCH_SIZE = 5000
const USER_CACHE_MAX = 50_000

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')
  await mongoose.connect(uri)

  for (const name of Object.keys(collections)) {
    if (!mongoose.models[name]) mongoose.model(name, collections[name])
  }
  const Quote = mongoose.model('Quote')
  const User = mongoose.model('User')
  const GroupMember = mongoose.model('GroupMember')

  const fromArgIdx = process.argv.indexOf('--from')
  let lastId = fromArgIdx > -1 && process.argv[fromArgIdx + 1]
    ? new mongoose.Types.ObjectId(process.argv[fromArgIdx + 1])
    : null

  const userCache = new Map() // ObjectId → telegram_id
  let totalQuotes = 0
  let totalOps = 0
  const started = Date.now()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const filter = lastId ? { _id: { $gt: lastId } } : {}
    const batch = await Quote.find(filter)
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .select({ _id: 1, group: 1, user: 1, 'authors.telegram_id': 1 })
      .lean()

    if (batch.length === 0) break

    // Resolve User._id → telegram_id for all uncached quoters in this batch
    const missingUserIds = []
    for (const q of batch) {
      if (q.user && !userCache.has(String(q.user))) missingUserIds.push(q.user)
    }
    if (missingUserIds.length > 0) {
      const users = await User.find({ _id: { $in: missingUserIds } })
        .select({ telegram_id: 1 })
        .lean()
      for (const u of users) userCache.set(String(u._id), u.telegram_id)
      // Prevent unbounded cache growth — drop LRU-ish head
      if (userCache.size > USER_CACHE_MAX) {
        const drop = userCache.size - USER_CACHE_MAX
        const keys = userCache.keys()
        for (let i = 0; i < drop; i++) userCache.delete(keys.next().value)
      }
    }

    const ops = []
    const seenInBatch = new Set()
    for (const q of batch) {
      const tgIds = []
      if (q.user) {
        const tg = userCache.get(String(q.user))
        if (typeof tg === 'number' && tg > 0) tgIds.push(tg)
      }
      if (Array.isArray(q.authors)) {
        for (const a of q.authors) {
          if (a && typeof a.telegram_id === 'number' && a.telegram_id > 0) tgIds.push(a.telegram_id)
        }
      }
      for (const tg of tgIds) {
        const key = `${q.group}:${tg}`
        if (seenInBatch.has(key)) continue
        seenInBatch.add(key)
        ops.push({
          updateOne: {
            filter: { group: q.group, telegram_id: tg },
            update: { $setOnInsert: { group: q.group, telegram_id: tg, firstSeenAt: new Date() } },
            upsert: true
          }
        })
      }
    }

    if (ops.length > 0) {
      try {
        await GroupMember.bulkWrite(ops, { ordered: false })
      } catch (err) {
        // Duplicate key errors are expected (concurrent writes from live bot) — ignore.
        if (err.code !== 11000 && err.writeErrors && !err.writeErrors.every(e => e.code === 11000)) {
          console.error('[bulkWrite] non-dup error:', err.message)
        }
      }
    }

    lastId = batch[batch.length - 1]._id
    totalQuotes += batch.length
    totalOps += ops.length
    const elapsed = ((Date.now() - started) / 1000).toFixed(0)
    console.log(`[${elapsed}s] quotes=${totalQuotes} ops=${totalOps} lastId=${lastId}`)
  }

  console.log(`done: ${totalQuotes} quotes processed, ${totalOps} (group,tg) pairs upserted`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

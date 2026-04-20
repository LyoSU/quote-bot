#!/usr/bin/env node

/**
 * One-off cleanup: renumber quotes in groups that have duplicate local_id
 * values (leftover from a pre-fix race on quoteCounter).
 *
 * Strategy: for each group, stream quotes with local_id set via cursor,
 * sort by createdAt ascending, and rewrite local_id as 1..N in 1000-op
 * batches. Then advance group.quoteCounter via $max (never regresses, safe
 * against concurrent $inc from the live bot). Skips groups with no duplicates.
 *
 * Safe to run with the bot live — the bot's atomic $inc keeps issuing fresh
 * local_ids, and $max ensures we never hand out a number below what's already
 * in flight.
 *
 * Dry run by default — pass --apply to write. Safe to re-run; idempotent once
 * local_ids are unique within a group.
 *
 * Usage:
 *   node scripts/fix-duplicate-local-ids.js           # dry run
 *   node scripts/fix-duplicate-local-ids.js --apply   # write
 */

require('dotenv').config()
const mongoose = require('mongoose')
const collections = require('../database/models')

const APPLY = process.argv.includes('--apply')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')
  await mongoose.connect(uri)

  for (const name of Object.keys(collections)) {
    if (!mongoose.models[name]) mongoose.model(name, collections[name])
  }
  const Quote = mongoose.model('Quote')
  const Group = mongoose.model('Group')

  console.log(APPLY ? '[APPLY] writing changes' : '[DRY RUN] no writes — pass --apply to persist')

  // Find groups whose quotes have at least one duplicate local_id.
  // allowDiskUse is mandatory at production scale: $group over tens of
  // millions of docs blows the 100MB in-memory limit without it.
  // $project trims docs before the expensive group stage.
  const tAgg = Date.now()
  console.log('scanning for duplicate local_ids (this is the slow part — expect minutes on large collections)…')
  const dupAgg = await Quote.aggregate(
    [
      { $match: { local_id: { $exists: true, $ne: null } } },
      { $project: { _id: 0, group: 1, local_id: 1 } },
      { $group: { _id: { group: '$group', local_id: '$local_id' }, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
      { $group: { _id: '$_id.group', collisions: { $sum: 1 } } },
    ],
    { allowDiskUse: true },
  )

  console.log(`groups with duplicate local_id: ${dupAgg.length} (scan took ${((Date.now() - tAgg) / 1000).toFixed(1)}s)`)

  let groupsFixed = 0
  let quotesRenumbered = 0
  const total = dupAgg.length
  const tStart = Date.now()

  for (const [idx, { _id: groupId, collisions }] of dupAgg.entries()) {
    const done = idx + 1
    const pct = total > 0 ? ((done / total) * 100).toFixed(1) : '100.0'
    const prefix = `[${done}/${total} ${pct}%]`
    // Stream via cursor — loading all quotes of a huge group into RAM would
    // OOM on DevHub-sized archives (millions of docs per group).
    const cursor = Quote.find({ group: groupId, local_id: { $exists: true, $ne: null } })
      .sort({ createdAt: 1, _id: 1 })
      .select({ _id: 1, local_id: 1 })
      .lean()
      .cursor({ batchSize: 1000 })

    let i = 0
    let queued = 0
    let ops = []

    for await (const q of cursor) {
      i++
      if (q.local_id !== i) {
        ops.push({
          updateOne: {
            filter: { _id: q._id },
            update: { $set: { local_id: i } },
          },
        })
        queued++
      }
      if (ops.length >= 1000) {
        if (APPLY) await Quote.bulkWrite(ops, { ordered: false })
        ops = []
      }
    }
    if (ops.length && APPLY) await Quote.bulkWrite(ops, { ordered: false })

    const maxLocalId = i
    const elapsed = (Date.now() - tStart) / 1000
    const eta = done > 0 && done < total ? ((elapsed / done) * (total - done)).toFixed(0) : '0'
    console.log(
      `${prefix} group ${groupId}: ${i} quotes, ${collisions} collisions, ${queued} updates, counter→≥${maxLocalId}, eta ${eta}s`,
    )

    if (APPLY) {
      // $max, not $set: live bot's atomic $inc may have advanced the counter
      // past maxLocalId while we streamed. $set would regress it and the next
      // insert would collide with a local_id we just assigned.
      await Group.updateOne({ _id: groupId }, { $max: { quoteCounter: maxLocalId } })
      if (queued > 0) {
        groupsFixed++
        quotesRenumbered += queued
      }
    }
  }

  const totalElapsed = ((Date.now() - tStart) / 1000).toFixed(1)
  console.log(`done in ${totalElapsed}s. groups fixed: ${groupsFixed}, quotes renumbered: ${quotesRenumbered}`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

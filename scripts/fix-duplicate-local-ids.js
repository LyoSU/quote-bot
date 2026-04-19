#!/usr/bin/env node

/**
 * One-off cleanup: renumber quotes in groups that have duplicate local_id
 * values (leftover from a pre-fix race on quoteCounter).
 *
 * Strategy: for each group, find quotes with local_id set, sort by createdAt
 * ascending, and rewrite local_id as 1..N. Then set group.quoteCounter to N
 * so new quotes continue the sequence. Skips groups with no duplicates.
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
  const dupAgg = await Quote.aggregate([
    { $match: { local_id: { $exists: true, $ne: null } } },
    { $group: { _id: { group: '$group', local_id: '$local_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $group: { _id: '$_id.group', collisions: { $sum: 1 } } },
  ])

  console.log(`groups with duplicate local_id: ${dupAgg.length}`)

  let groupsFixed = 0
  let quotesRenumbered = 0

  for (const { _id: groupId, collisions } of dupAgg) {
    const quotes = await Quote.find({ group: groupId, local_id: { $exists: true, $ne: null } })
      .sort({ createdAt: 1, _id: 1 })
      .select({ _id: 1, local_id: 1, createdAt: 1 })
      .lean()

    const ops = []
    quotes.forEach((q, i) => {
      const target = i + 1
      if (q.local_id !== target) {
        ops.push({
          updateOne: {
            filter: { _id: q._id },
            update: { $set: { local_id: target } },
          },
        })
      }
    })

    const maxLocalId = quotes.length
    console.log(
      `group ${groupId}: ${quotes.length} quotes, ${collisions} collisions, ${ops.length} updates, counter→${maxLocalId}`,
    )

    if (APPLY && ops.length > 0) {
      await Quote.bulkWrite(ops, { ordered: false })
      await Group.updateOne({ _id: groupId }, { $set: { quoteCounter: maxLocalId } })
      groupsFixed++
      quotesRenumbered += ops.length
    } else if (APPLY) {
      // No renumbering needed but advance counter if it's behind.
      await Group.updateOne(
        { _id: groupId, quoteCounter: { $lt: maxLocalId } },
        { $set: { quoteCounter: maxLocalId } },
      )
    }
  }

  console.log(`done. groups fixed: ${groupsFixed}, quotes renumbered: ${quotesRenumbered}`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

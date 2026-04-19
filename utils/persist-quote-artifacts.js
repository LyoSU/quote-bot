// Fire-and-forget post-quote persistence. Called from handlers/quote.js
// inside setImmediate after the user-visible sticker reply has shipped.
//
// Allocates global_id here (not on the /q critical path) — the global Counter
// is a single shared document and its $inc is a known hot-spot under load;
// allocating it post-send keeps that contention invisible to the user.
//
// Always resolves — errors are logged with structured prefixes
// ([quote:persist] ...) but never re-thrown. The caller is already
// detached from the request lifecycle.

module.exports = async function persistQuoteArtifacts ({ db, doc, groupId, memberTgIds }) {
  try {
    const counter = await db.Counter.findOneAndUpdate(
      { _id: 'quote' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, projection: { seq: 1 } }
    )
    if (counter && counter.seq != null) doc.global_id = counter.seq
  } catch (err) {
    console.error('[quote:persist] Counter $inc failed', err)
  }

  try {
    await db.Quote.create(doc)
  } catch (err) {
    console.error('[quote:persist] Quote.create failed', { file_unique_id: doc && doc.file_unique_id }, err)
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

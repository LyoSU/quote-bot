const { Schema } = require('mongoose')

// One row per (group, telegram_id) pair. Populated opportunistically by
// handlers/quote.js whenever a user quotes or is quoted — the only reliable
// "user was present here" signal we have without tracking chat_member events.
//
// Webapp uses this to resolve "My groups" in one indexed lookup without
// scanning the 77M-row quotes collection.
const groupMemberSchema = new Schema({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  telegram_id: {
    type: Number,
    required: true
  },
  firstSeenAt: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false
})

// Primary lookup — "which groups is this user in?" — and dedup guard.
groupMemberSchema.index({ telegram_id: 1, group: 1 }, { unique: true })
// Secondary — "who's in this group?"
groupMemberSchema.index({ group: 1, telegram_id: 1 })

module.exports = groupMemberSchema

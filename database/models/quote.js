const { Schema } = require('mongoose')

const quoteSchema = Schema({
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
  }
}, {
  timestamps: true
})

// Indexes for common queries.
// { group: 1 } is intentionally omitted — the compound index below serves
// group-only lookups via its leading prefix.
quoteSchema.index({ group: 1, 'rate.score': -1 })
quoteSchema.index({ 'rate.votes.vote': 1, 'rate.score': -1 })

module.exports = quoteSchema

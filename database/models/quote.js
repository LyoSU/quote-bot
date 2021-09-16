const { Schema } = require('mongoose')

const quoteSchema = Schema({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  file_id: {
    type: String,
    unique: true,
    required: true
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
        ref: 'User',
        index: true
      }]
    }],
    score: {
      type: Number,
      index: true
    }
  }
}, {
  timestamps: true
})

module.exports = quoteSchema

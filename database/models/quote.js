const mongoose = require('mongoose')

const voteSchema = mongoose.Schema({

})

const quoteSchema = mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  file_id: {
    type: String,
    index: true,
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

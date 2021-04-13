const mongoose = require('mongoose')

const advSchema = mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  text: String,
  link: String,
  locale: String,
  price: Number,
  count: Number,
  status: {
    type: Number,
    default: 0
  },
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  stats: {
    impressions: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
})

module.exports = advSchema

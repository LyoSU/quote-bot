const { Schema } = require('mongoose')

const advSchema = Schema({
  creator: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
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

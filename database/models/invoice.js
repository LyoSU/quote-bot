const { Schema } = require('mongoose')

const schema = Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: Number,
  status: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

module.exports = schema

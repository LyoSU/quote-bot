const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
  telegram_id: {
    type: Number,
    index: true,
    unique: true,
    required: true
  },
  first_name: {
    type: String,
    index: true
  },
  last_name: {
    type: String,
    index: true
  },
  username: {
    type: String,
    index: true
  },
  settings: {
    locale: String,
    quote: {
      backgroundColor: {
        type: String,
        default: '#130f1c'
      }
    },
    hidden: Boolean
  }
}, {
  timestamps: true
})

module.exports = userSchema

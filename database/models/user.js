const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
  telegram_id: {
    type: Number,
    index: true,
    unique: true,
    required: true,
  },
  first_name: String,
  last_name: String,
  username: String,
  settings: {
    locale: String,
    quote: {
      backgroundColor: {
        type: String,
        default: '#120E1BB3'
      }
    }
  }
}, {
  timestamps: true,
})

module.exports = userSchema

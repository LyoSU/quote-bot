const mongoose = require('mongoose')

const groupSchema = mongoose.Schema({
  group_id: {
    type: Number,
    index: true,
    unique: true,
    required: true
  },
  title: String,
  username: String,
  invite_link: String,
  settings: {
    locale: String,
    quote: {
      backgroundColor: {
        type: String,
        default: '#120E1B80'
      }
    },
    rate: {
      type: Boolean,
      default: false
    }
  },
  stickerSet: {
    name: String,
    create: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
})

module.exports = groupSchema

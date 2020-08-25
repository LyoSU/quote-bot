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
        default: '#1b1429'
      }
    },
    rate: {
      type: Boolean,
      default: false
    },
    hidden: Boolean
  },
  stickerSet: {
    name: String,
    create: {
      type: Boolean,
      default: false
    }
  },
  topSet: {
    name: String,
    create: {
      type: Boolean,
      default: false
    },
    lastUpdate: Date,
    stickers: [{
      quote: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quote'
      },
      fileId: String,
      fileUniqueId: String
    }]
  }
}, {
  timestamps: true
})

module.exports = groupSchema

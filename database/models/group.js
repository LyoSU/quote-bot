const { Schema } = require('mongoose')

const groupSchema = Schema({
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
      default: true
    },
    hidden: {
      type: Boolean,
      default: false
    },
    privacy: {
      type: Boolean,
      default: false
    },
    randomQuoteGab: {
      type: Number,
      default: 0
    }
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
        type: Schema.Types.ObjectId,
        ref: 'Quote'
      },
      fileId: String,
      fileUniqueId: String
    }]
  },
  lastRandomQuote: {
    type: Date,
    default: Date()
  }
}, {
  timestamps: true
})

module.exports = groupSchema

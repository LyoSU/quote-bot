const { Schema } = require('mongoose')

// Single-document atomic sequence used to mint monotonic IDs.
// We currently use { _id: 'quote' } for Quote.global_id.
const counterSchema = new Schema({
  _id: String,
  seq: { type: Number, default: 0 }
}, {
  versionKey: false
})

module.exports = counterSchema

const mongoose = require('mongoose')

const statsSchema = mongoose.Schema({
  rps: Number,
  responseTime: Number
}, {
  timestamps: true
})

module.exports = statsSchema

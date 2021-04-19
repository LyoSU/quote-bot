const mongoose = require('mongoose')

const statsSchema = mongoose.Schema({
  rps: Number,
  responseTime: Number,
  date: {
    type: Date,
    index: true
  }
}, {
  capped: { size: 1000 * 1000 * 100, max: 100000 }
})

module.exports = statsSchema

const mongoose = require('mongoose')

const statsSchema = mongoose.Schema({
  rps: Number,
  responseTime: Number,
  date: {
    type: Date,
    index: true
  }
})

module.exports = statsSchema

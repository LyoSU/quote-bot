const mongoose = require('mongoose')

const connection = mongoose.createConnection(process.env.MONGODB_URI, {
  poolSize: 10,
  maxTimeMS: 3,
  useUnifiedTopology: true,
  useNewUrlParser: true
})

module.exports = connection

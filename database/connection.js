const mongoose = require('mongoose')

const connection = mongoose.createConnection(process.env.MONGODB_URI, {
  poolSize: 100,
  useUnifiedTopology: true,
  useNewUrlParser: true
})

module.exports = connection

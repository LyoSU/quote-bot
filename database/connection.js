const mongoose = require('mongoose')

const connection = mongoose.createConnection(process.env.MONGODB_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true
})

connection.catch((error) => {
  console.log('DB error', error)
})

module.exports = connection

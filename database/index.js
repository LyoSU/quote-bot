const collections = require('./models')
const connection = require('./connection')

const db = {
  connection,
  ready: connection.readyPromise
}

Object.keys(collections).forEach((collectionName) => {
  db[collectionName] = connection.model(collectionName, collections[collectionName])
})

module.exports = {
  db
}

const fs = require('fs')

module.exports = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (_error, data) => {
      resolve(data)
    })
  })
}

const { conversations } = require('@grammyjs/conversations')

module.exports = (...conversations) => {
  return conversations()
}

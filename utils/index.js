const generateQuote = require('./quote-generate')
const loadCanvasImage = require('./canvas-image-load')
const loadImageFromUrl = require('./image-load-url')
const loadImageFromPath = require('./image-load-path')
const userName = require('./user-name')

module.exports = {
  generateQuote,
  loadCanvasImage,
  loadImageFromUrl,
  loadImageFromPath,
  userName
}

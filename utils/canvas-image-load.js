const { Image } = require('canvas')

module.exports = (image) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = image
  })
}

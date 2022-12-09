const got = require('got')

module.exports = async (ctx, next) => {
  if (!ctx.chat.username) {
    return next()
  }
  const { set_name } = ctx.message.sticker

  if (!set_name || set_name.match(/_by_(.*)bot$/gmi)) {
    return next()
  }

  if (Math.random() > 0.1) { // 10% chance
    return next()
  }

  got.post(process.env.FSTIK_API_URI + '/publishStickerSet', {
    json: {
      name: set_name
    }
  }).catch(() => {})

  return next()
}

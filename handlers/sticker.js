const got = require('got')

module.exports = async (ctx, next) => {
  if (!ctx.chat.username) {
    return next()
  }

  if (ctx.message.sticker) {
    const { set_name } = ctx.message.sticker

    if (!set_name || set_name.match(/_by_(.*)bot$/gmi)) {
      return next()
    }

    got.post(process.env.FSTIK_API_URI + '/publishStickerSet?token=' + process.env.BOT_TOKEN, {
      json: {
        name: set_name
      }
    }).catch(() => {})
  } else if (ctx.message.entities || ctx.message.entities) {
    const entities = ctx.message.entities || ctx.message.caption_entities

    entities.forEach(async (entity) => {
      if (entity.type === 'custom_emoji') {
        const emojiStickers = await ctx.telegram.callApi('getCustomEmojiStickers', {
          custom_emoji_ids: [entity.custom_emoji_id]
        })

        if (emojiStickers.length > 0) {
          const sticker = emojiStickers[0]

          if (!sticker.set_name) {
            return
          }

          got.post(process.env.FSTIK_API_URI + '/publishStickerSet?token=' + process.env.BOT_TOKEN, {
            json: {
              name: sticker.set_name
            }
          }).catch(() => {})
        }
      }
    })
  }

  return next()
}

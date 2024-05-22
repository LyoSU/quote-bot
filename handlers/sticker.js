const got = require('got')
const Redis = require('ioredis')

const redis = new Redis()

const PREFIX = 'quotly'

const getTopStickerSets = async () => {
  const stickerSets = await redis.zrevrange(`${PREFIX}:sticker_sets`, 0, -1, 'WITHSCORES')
  const stickerCount = {}

  for (let i = 0; i < stickerSets.length; i += 2) {
    const stickerSet = stickerSets[i]
    const count = parseInt(stickerSets[i + 1], 10)
    stickerCount[stickerSet] = count
  }

  const sortedStickerSets = Object.entries(stickerCount)
    .sort((a, b) => b[1] - a[1])
    .map(entry => {
      if (entry[1] <= 10) {
        return null
      }
      return {
        name: entry[0],
        count: entry[1]
      }
    })
    .filter(entry => entry)

  for (const stickerSet of sortedStickerSets) {
    await got.post(process.env.FSTIK_API_URI + '/publishStickerSet?token=' + process.env.BOT_TOKEN, {
      json: {
        name: stickerSet.name,
        count: stickerSet.count
      }
    }).catch((error) => {
      console.error('Error publishing sticker set:', error)
    })
    redis.del(`${PREFIX}:sticker_set:${stickerSet.name}:*`)
    redis.zrem(`${PREFIX}:sticker_sets`, stickerSet.name)
  }

  return sortedStickerSets
}

setInterval(async () => {
  const topStickerSets = await getTopStickerSets()

  console.log(`Top 10 sticker sets in the last minute: ${topStickerSets.map(set => `${set.name} (${set.count})`).join(', ')}`)
}, 1000 * 60 * 10)

module.exports = async (ctx, next) => {
  if (!ctx.chat.username) {
    return next()
  }

  if (ctx.message.sticker) {
    const { set_name } = ctx.message.sticker

    const key = `${PREFIX}:sticker_set:${set_name}:${Date.now()}`
    redis.zincrby(`${PREFIX}:sticker_sets`, 1, set_name)
    redis.set(key, 1, 'EX', 60)
  } else if (ctx.message.entities || ctx.message.entities) {
    const entities = ctx.message.entities || ctx.message.caption_entities

    const customEmoji = entities.map((entity) => {
      if (entity.type === 'custom_emoji') {
        return entity.custom_emoji_id
      }
    }).filter((entity) => entity)

    if (customEmoji.length > 0) {
      const emojiStickers = await ctx.telegram.callApi('getCustomEmojiStickers', {
        custom_emoji_ids: customEmoji
      })

      const uniqueStickerSets = new Set(emojiStickers.map(sticker => sticker.set_name))

      uniqueStickerSets.forEach(setName => {
        const key = `${PREFIX}:sticker_set:${setName}:${Date.now()}`
        redis.zincrby(`${PREFIX}:sticker_sets`, 1, setName)
        redis.set(key, 1, 'EX', 60)
      })
    }
  }

  return next()
}

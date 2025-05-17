/* eslint-disable camelcase */
const got = require('got')
const Redis = require('ioredis')

// Redis connection setup
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
})

// Constants
const PREFIX = 'quotly'
const PUBLISH_DELAY = 1000
const MIN_USES = 10
const MIN_UNIQUE_USERS = 10
const MIN_UNIQUE_STICKERS = 5
const MIN_GROUPS = 10
const MAX_USES_PER_USER = 10
const DATA_EXPIRE_TIME = 60 * 60 // 1 hour

// Track last publish time to implement delay
let lastPublishTime = 0

/**
 * Validates if a sticker set meets quality criteria
 */
async function isQualitySet (setName) {
  const uniqueUsers = await redis.scard(`${PREFIX}:sticker_set:${setName}:users`)
  const uniqueStickers = await redis.scard(`${PREFIX}:sticker_set:${setName}:stickers`)
  const uniqueGroups = await redis.scard(`${PREFIX}:sticker_set:${setName}:groups`)
  const totalUses = await redis.zscore(`${PREFIX}:sticker_sets`, setName)

  return uniqueUsers >= MIN_UNIQUE_USERS &&
        uniqueStickers >= MIN_UNIQUE_STICKERS &&
        uniqueGroups >= MIN_GROUPS &&
        totalUses / uniqueUsers < MAX_USES_PER_USER
}

/**
 * Publishes a sticker set with delay to avoid API flooding
 */
async function publishWithDelay (stickerSet) {
  const now = Date.now()
  if (now - lastPublishTime < PUBLISH_DELAY) {
    await new Promise(resolve => setTimeout(resolve, PUBLISH_DELAY))
  }

  try {
    await got.post(process.env.FSTIK_API_URI + '/publishStickerSet?token=' + process.env.BOT_TOKEN, {
      json: {
        name: stickerSet.name,
        count: stickerSet.count
      }
    })

    // Mark as published
    await redis.sadd(`${PREFIX}:published_sets`, stickerSet.name)
    console.log(`Published sticker set: ${stickerSet.name} (${stickerSet.count} uses)`)

    lastPublishTime = Date.now()
  } catch (error) {
    console.error('Error publishing sticker set:', error)
  }
}

/**
 * Gets and processes top sticker sets
 */
const getTopStickerSets = async () => {
  const stickerSets = await redis.zrevrange(`${PREFIX}:sticker_sets`, 0, -1, 'WITHSCORES')
  const stickerCount = {}

  for (let i = 0; i < stickerSets.length; i += 2) {
    const stickerSet = stickerSets[i]
    const count = parseInt(stickerSets[i + 1], 10)

    if (count > MIN_USES) {
      // Validate quality metrics
      const isQuality = await isQualitySet(stickerSet)
      if (isQuality) {
        stickerCount[stickerSet] = count
      }
    }
  }

  const sortedStickerSets = Object.entries(stickerCount)
    .sort((a, b) => b[1] - a[1])
    .map(entry => ({
      name: entry[0],
      count: entry[1]
    }))

  // Publish each qualifying set
  for (const stickerSet of sortedStickerSets) {
    await publishWithDelay(stickerSet)

    // Cleanup Redis data for this set
    await redis.del(`${PREFIX}:sticker_set:${stickerSet.name}:users`)
    await redis.del(`${PREFIX}:sticker_set:${stickerSet.name}:stickers`)
    await redis.del(`${PREFIX}:sticker_set:${stickerSet.name}:groups`)
    await redis.zrem(`${PREFIX}:sticker_sets`, stickerSet.name)
  }

  return sortedStickerSets
}

// Run checks every 10 minutes
// setInterval(async () => {
//   const topStickerSets = await getTopStickerSets()
//   if (topStickerSets.length > 0) {
//     console.log(`Processed ${topStickerSets.length} qualifying sticker sets`)
//   }
// }, 1000 * 60 * 10)

/**
 * Middleware to track sticker usage
 */
module.exports = async (ctx, next) => {
  if (ctx.message.sticker) {
    const { set_name } = ctx.message.sticker

    // Track unique users
    await redis.sadd(`${PREFIX}:sticker_set:${set_name}:users`, ctx.from.id)
    await redis.expire(`${PREFIX}:sticker_set:${set_name}:users`, DATA_EXPIRE_TIME)

    // Track unique stickers
    await redis.sadd(`${PREFIX}:sticker_set:${set_name}:stickers`, ctx.message.sticker.file_id)
    await redis.expire(`${PREFIX}:sticker_set:${set_name}:stickers`, DATA_EXPIRE_TIME)

    // Track groups
    await redis.sadd(`${PREFIX}:sticker_set:${set_name}:groups`, ctx.chat.id)
    await redis.expire(`${PREFIX}:sticker_set:${set_name}:groups`, DATA_EXPIRE_TIME)

    // Increment usage counter
    await redis.zincrby(`${PREFIX}:sticker_sets`, 1, set_name)
  } else if (ctx.message.entities || ctx.message.caption_entities) {
    const entities = ctx.message.entities || ctx.message.caption_entities

    const customEmoji = entities
      .filter(entity => entity.type === 'custom_emoji')
      .map(entity => entity.custom_emoji_id)

    if (customEmoji.length > 0) {
      try {
        const emojiStickers = await ctx.telegram.callApi('getCustomEmojiStickers', {
          custom_emoji_ids: customEmoji
        })

        const uniqueStickerSets = new Set(emojiStickers.map(sticker => sticker.set_name))

        for (const setName of uniqueStickerSets) {
          // Track unique users
          await redis.sadd(`${PREFIX}:sticker_set:${setName}:users`, ctx.from.id)
          await redis.expire(`${PREFIX}:sticker_set:${setName}:users`, DATA_EXPIRE_TIME)

          // Track unique stickers
          for (const sticker of emojiStickers.filter(s => s.set_name === setName)) {
            await redis.sadd(`${PREFIX}:sticker_set:${setName}:stickers`, sticker.file_id)
          }
          await redis.expire(`${PREFIX}:sticker_set:${setName}:stickers`, DATA_EXPIRE_TIME)

          // Track groups
          await redis.sadd(`${PREFIX}:sticker_set:${setName}:groups`, ctx.chat.id)
          await redis.expire(`${PREFIX}:sticker_set:${setName}:groups`, DATA_EXPIRE_TIME)

          // Increment usage counter
          await redis.zincrby(`${PREFIX}:sticker_sets`, 1, setName)
        }
      } catch (error) {
        console.error('Error processing custom emoji:', error)
      }
    }
  }

  return next()
}

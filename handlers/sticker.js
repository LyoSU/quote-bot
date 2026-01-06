/* eslint-disable camelcase */
const Redis = require('ioredis')

// Redis connection setup
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: true
})

// Connect on first use
let redisConnected = false
const ensureRedisConnected = async () => {
  if (!redisConnected) {
    await redis.connect()
    redisConnected = true
  }
}

// Constants
const PREFIX = 'quotly'
const DATA_EXPIRE_TIME = 24 * 60 * 60 // 24 hours (extended from 1 hour)
const HOURLY_EXPIRE_TIME = 25 * 60 * 60 // 25 hours for hourly buckets

/**
 * Track sticker usage with HyperLogLog for memory efficiency
 * HyperLogLog uses ~12KB per key regardless of cardinality
 *
 * Data structure:
 * - quotly:hll:{setName}:users   - HyperLogLog for unique users
 * - quotly:hll:{setName}:groups  - HyperLogLog for unique groups
 * - quotly:hourly:{hour}:{setName} - Hash with count for velocity calculation
 * - quotly:sticker_sets          - Sorted set with total counts
 */
async function trackStickerUsage (setName, userId, chatId) {
  if (!setName) return

  const hour = Math.floor(Date.now() / 3600000) // Current hour bucket

  try {
    const pipe = redis.pipeline()

    // HyperLogLog for unique users (memory efficient ~12KB per key)
    pipe.pfadd(`${PREFIX}:hll:${setName}:users`, String(userId))
    pipe.expire(`${PREFIX}:hll:${setName}:users`, DATA_EXPIRE_TIME)

    // HyperLogLog for unique groups
    pipe.pfadd(`${PREFIX}:hll:${setName}:groups`, String(chatId))
    pipe.expire(`${PREFIX}:hll:${setName}:groups`, DATA_EXPIRE_TIME)

    // Hourly bucket for velocity calculation
    pipe.hincrby(`${PREFIX}:hourly:${hour}:${setName}`, 'count', 1)
    pipe.expire(`${PREFIX}:hourly:${hour}:${setName}`, HOURLY_EXPIRE_TIME)

    // Total usage counter (sorted set)
    pipe.zincrby(`${PREFIX}:sticker_sets`, 1, setName)

    // Run all commands
    await new Promise((resolve, reject) => {
      pipe.then(resolve).catch(reject)
    })
  } catch (error) {
    // Don't throw - stats collection shouldn't break the bot
    console.error('Error tracking sticker usage:', error.message)
  }
}

/**
 * Middleware to track sticker usage
 * Lightweight - only collects data, publishing is done separately
 */
module.exports = async (ctx, next) => {
  await ensureRedisConnected()

  // Track regular stickers
  if (ctx.message?.sticker?.set_name) {
    trackStickerUsage(
      ctx.message.sticker.set_name,
      ctx.from.id,
      ctx.chat.id
    )
  }

  // Track custom emoji
  const entities = ctx.message?.entities || ctx.message?.caption_entities
  if (entities?.length > 0) {
    const customEmoji = entities
      .filter(entity => entity.type === 'custom_emoji')
      .map(entity => entity.custom_emoji_id)

    if (customEmoji.length > 0) {
      try {
        const emojiStickers = await ctx.telegram.callApi('getCustomEmojiStickers', {
          custom_emoji_ids: customEmoji
        })

        const uniqueSets = new Set(
          emojiStickers
            .map(sticker => sticker.set_name)
            .filter(Boolean)
        )

        for (const setName of uniqueSets) {
          trackStickerUsage(setName, ctx.from.id, ctx.chat.id)
        }
      } catch (error) {
        // Silently ignore - custom emoji tracking is not critical
      }
    }
  }

  return next()
}

// Export redis instance and prefix for publisher service
module.exports.redis = redis
module.exports.PREFIX = PREFIX
module.exports.DATA_EXPIRE_TIME = DATA_EXPIRE_TIME

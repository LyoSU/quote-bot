/* eslint-disable camelcase */
const { createRedisClient } = require('../utils/redis')

// Redis connection setup
const redis = createRedisClient()

// Cache for custom emoji sticker sets (reduces API calls)
const emojiSetCache = new Map()
const EMOJI_CACHE_TTL = 3600000 // 1 hour

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
    // Use multi() for atomic execution, returns promise on exec()
    const multi = redis.multi()

    // HyperLogLog for unique users (memory efficient ~12KB per key)
    multi.pfadd(`${PREFIX}:hll:${setName}:users`, String(userId))
    multi.expire(`${PREFIX}:hll:${setName}:users`, DATA_EXPIRE_TIME)

    // HyperLogLog for unique groups
    multi.pfadd(`${PREFIX}:hll:${setName}:groups`, String(chatId))
    multi.expire(`${PREFIX}:hll:${setName}:groups`, DATA_EXPIRE_TIME)

    // Hourly bucket for velocity calculation
    multi.hincrby(`${PREFIX}:hourly:${hour}:${setName}`, 'count', 1)
    multi.expire(`${PREFIX}:hourly:${hour}:${setName}`, HOURLY_EXPIRE_TIME)

    // Total usage counter (sorted set)
    multi.zincrby(`${PREFIX}:sticker_sets`, 1, setName)

    // Execute all commands
    await multi.exec()
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
        // Check cache first
        const uncachedEmoji = customEmoji.filter(id => !emojiSetCache.has(id))
        
        if (uncachedEmoji.length > 0) {
          const emojiStickers = await ctx.telegram.callApi('getCustomEmojiStickers', {
            custom_emoji_ids: uncachedEmoji
          })
          
          // Cache results
          for (const sticker of emojiStickers) {
            if (sticker.custom_emoji_id && sticker.set_name) {
              emojiSetCache.set(sticker.custom_emoji_id, sticker.set_name)
              setTimeout(() => emojiSetCache.delete(sticker.custom_emoji_id), EMOJI_CACHE_TTL)
            }
          }
        }

        // Collect unique sets from cache
        const uniqueSets = new Set()
        for (const emojiId of customEmoji) {
          const setName = emojiSetCache.get(emojiId)
          if (setName) uniqueSets.add(setName)
        }

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

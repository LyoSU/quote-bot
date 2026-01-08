/**
 * Sticker Stats Publisher Service
 *
 * Collects aggregated sticker usage statistics from Redis
 * and publishes them to fstikbot-api in batches.
 *
 * Features:
 * - Distributed lock (only one instance publishes)
 * - Batch publishing every 5 minutes
 * - Quality filtering (anti-spam)
 * - Velocity calculation for trending detection
 * - Retry mechanism with exponential backoff
 */

const { createRedisClient } = require('../utils/redis')

const PREFIX = 'quotly'

// Configuration
const CONFIG = {
  PUBLISH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  LOCK_KEY: `${PREFIX}:publisher:lock`,
  LOCK_TTL: 120, // 2 minutes
  MAX_BATCH_SIZE: 200,
  MIN_COUNT: 5,
  MIN_UNIQUE_USERS: 5,
  MIN_UNIQUE_GROUPS: 3,
  MAX_USES_PER_USER: 20,
  SOURCE_ID: 'quotly'
}

class StickerStatsPublisher {
  constructor (options = {}) {
    this.redis = options.redis || createRedisClient({ lazyConnect: false })

    this.apiUri = options.apiUri || process.env.FSTIK_API_URI
    this.botToken = options.botToken || process.env.BOT_TOKEN

    this.retryQueue = []
    this.maxRetries = 3
    this.isRunning = false
    this.intervalId = null
  }

  /**
   * Acquire distributed lock using SETNX
   * Only one instance can hold the lock at a time
   */
  async acquireLock () {
    const result = await this.redis.set(
      CONFIG.LOCK_KEY,
      `${process.pid}:${Date.now()}`,
      'NX',
      'EX',
      CONFIG.LOCK_TTL
    )
    return result === 'OK'
  }

  /**
   * Release the lock
   */
  async releaseLock () {
    await this.redis.del(CONFIG.LOCK_KEY)
  }

  /**
   * Extend lock TTL while processing
   */
  async extendLock () {
    await this.redis.expire(CONFIG.LOCK_KEY, CONFIG.LOCK_TTL)
  }

  /**
   * Calculate velocity (growth rate) for a sticker set
   * Compares current hour to average of previous 3 hours
   */
  async calculateVelocity (setName) {
    const currentHour = Math.floor(Date.now() / 3600000)

    const counts = await Promise.all([
      this.redis.hget(`${PREFIX}:hourly:${currentHour}:${setName}`, 'count'),
      this.redis.hget(`${PREFIX}:hourly:${currentHour - 1}:${setName}`, 'count'),
      this.redis.hget(`${PREFIX}:hourly:${currentHour - 2}:${setName}`, 'count'),
      this.redis.hget(`${PREFIX}:hourly:${currentHour - 3}:${setName}`, 'count')
    ])

    const current = parseInt(counts[0] || 0)
    const older = (
      parseInt(counts[1] || 0) +
      parseInt(counts[2] || 0) +
      parseInt(counts[3] || 0)
    ) / 3

    if (older === 0) return current > 0 ? 2.0 : 0
    return Math.round((current / older) * 100) / 100 // 2 decimal places
  }

  /**
   * Check if a sticker set passes quality filters
   */
  passQualityChecks ({ count, uniqueUsers, uniqueGroups }) {
    // Minimum thresholds
    if (count < CONFIG.MIN_COUNT) return false
    if (uniqueUsers < CONFIG.MIN_UNIQUE_USERS) return false
    if (uniqueGroups < CONFIG.MIN_UNIQUE_GROUPS) return false

    // Anti-spam: too many uses per user
    const avgUsesPerUser = count / uniqueUsers
    if (avgUsesPerUser > CONFIG.MAX_USES_PER_USER) return false

    // Anti-spam: suspicious group-to-user ratio
    if (uniqueGroups > uniqueUsers * 3) return false

    return true
  }

  /**
   * Collect all sticker set statistics from Redis
   */
  async collectStats () {
    const stickerSets = await this.redis.zrevrange(
      `${PREFIX}:sticker_sets`,
      0,
      CONFIG.MAX_BATCH_SIZE - 1,
      'WITHSCORES'
    )

    const batch = []

    for (let i = 0; i < stickerSets.length; i += 2) {
      const setName = stickerSets[i]
      const count = parseInt(stickerSets[i + 1])

      if (count < CONFIG.MIN_COUNT) continue

      // Get HyperLogLog counts
      const [uniqueUsers, uniqueGroups] = await Promise.all([
        this.redis.pfcount(`${PREFIX}:hll:${setName}:users`),
        this.redis.pfcount(`${PREFIX}:hll:${setName}:groups`)
      ])

      // Quality check
      if (!this.passQualityChecks({ count, uniqueUsers, uniqueGroups })) {
        continue
      }

      // Calculate velocity
      const velocity = await this.calculateVelocity(setName)

      batch.push({
        name: setName,
        count,
        uniqueUsers,
        uniqueGroups,
        velocity,
        avgUsesPerUser: Math.round((count / uniqueUsers) * 100) / 100
      })
    }

    return batch
  }

  /**
   * Clean up Redis data for published sets
   */
  async cleanupPublishedSets (setNames) {
    if (setNames.length === 0) return

    const multi = this.redis.multi()

    for (const name of setNames) {
      multi.del(`${PREFIX}:hll:${name}:users`)
      multi.del(`${PREFIX}:hll:${name}:groups`)
      multi.zrem(`${PREFIX}:sticker_sets`, name)

      // Clean up hourly buckets
      const currentHour = Math.floor(Date.now() / 3600000)
      for (let h = 0; h < 25; h++) {
        multi.del(`${PREFIX}:hourly:${currentHour - h}:${name}`)
      }
    }

    await multi.exec()
  }

  /**
   * Send batch to fstikbot-api
   */
  async sendBatch (batch) {
    if (!this.apiUri || !this.botToken) {
      console.error('Publisher: Missing FSTIK_API_URI or BOT_TOKEN')
      return false
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(`${this.apiUri}/publishStickerSetBatch`, {
        method: 'POST',
        body: JSON.stringify({
          token: this.botToken,
          stickerSets: batch,
          source: CONFIG.SOURCE_ID,
          timestamp: Date.now()
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log(`Publisher: Sent ${batch.length} sets - created: ${result.results?.created || 0}, updated: ${result.results?.updated || 0}`)
      return true
    } catch (error) {
      console.error('Publisher: Failed to send batch:', error.message)
      return false
    }
  }

  /**
   * Main publish cycle
   */
  async collectAndPublish () {
    // Try to acquire lock
    if (!await this.acquireLock()) {
      console.log('Publisher: Another instance is publishing, skipping')
      return
    }

    try {
      console.log('Publisher: Starting collection cycle')

      // Collect stats
      const batch = await this.collectStats()

      if (batch.length === 0) {
        console.log('Publisher: No qualifying sticker sets to publish')
        return
      }

      console.log(`Publisher: Collected ${batch.length} qualifying sticker sets`)

      // Extend lock before sending
      await this.extendLock()

      // Send to API
      const success = await this.sendBatch(batch)

      if (success) {
        // Clean up Redis data
        await this.cleanupPublishedSets(batch.map(b => b.name))
        console.log('Publisher: Cleanup completed')
      } else {
        // Add to retry queue
        this.retryQueue.push({
          batch,
          attempts: 1,
          nextRetry: Date.now() + 60000
        })
      }
    } catch (error) {
      console.error('Publisher: Error during publish cycle:', error.message)
    } finally {
      await this.releaseLock()
    }
  }

  /**
   * Process retry queue
   */
  async processRetryQueue () {
    const now = Date.now()
    const ready = this.retryQueue.filter(r => r.nextRetry <= now)

    for (const item of ready) {
      try {
        const success = await this.sendBatch(item.batch)
        if (success) {
          this.retryQueue = this.retryQueue.filter(r => r !== item)
          await this.cleanupPublishedSets(item.batch.map(b => b.name))
        } else {
          item.attempts++
          if (item.attempts >= this.maxRetries) {
            console.error(`Publisher: Max retries exceeded for batch of ${item.batch.length} sets`)
            this.retryQueue = this.retryQueue.filter(r => r !== item)
          } else {
            // Exponential backoff
            item.nextRetry = now + (Math.pow(2, item.attempts) * 60000)
          }
        }
      } catch (error) {
        console.error('Publisher: Retry failed:', error.message)
      }
    }
  }

  /**
   * Start the publisher service
   */
  start () {
    if (this.isRunning) {
      console.log('Publisher: Already running')
      return
    }

    this.isRunning = true
    console.log(`Publisher: Starting (interval: ${CONFIG.PUBLISH_INTERVAL / 1000}s)`)

    // Run immediately on start
    this.collectAndPublish()

    // Then run on interval
    this.intervalId = setInterval(async () => {
      await this.collectAndPublish()
      await this.processRetryQueue()
    }, CONFIG.PUBLISH_INTERVAL)
  }

  /**
   * Stop the publisher service
   */
  stop () {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('Publisher: Stopped')
  }
}

module.exports = StickerStatsPublisher

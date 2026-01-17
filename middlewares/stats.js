const { db } = require('../database')
const { createRedisClient } = require('../utils/redis')

const redis = createRedisClient({ lazyConnect: false })

const WINDOW_SIZE_SEC = 60
const UPDATE_INTERVAL_MS = 1000 * 30
const TTL_SECONDS = 120
const KEY_PREFIX = 'quote:stats:'
const BATCH_FLUSH_INTERVAL = 2000 // Flush every 2 seconds

class HighLoadStats {
  constructor () {
    this.lastUpdateTimestamp = Date.now()
    this.currentStats = {
      requests: { rps: 0, avgTime: 0, percentile95: 0 },
      messages: { mps: 0, avgTime: 0, percentile95: 0 },
      queue: { pending: 0 }
    }
    // Local batch for stats
    this.batch = { requests: [], messages: [] }
    this.startBatchFlush()
  }

  getKey (key) {
    return `${KEY_PREFIX}${key}`
  }

  startBatchFlush () {
    this.batchInterval = setInterval(() => this.flushBatch(), BATCH_FLUSH_INTERVAL)
  }

  async flushBatch () {
    const { requests, messages } = this.batch
    this.batch = { requests: [], messages: [] }

    if (requests.length === 0 && messages.length === 0) return

    try {
      const pipeline = redis.pipeline()
      const now = Date.now()
      const bucket = Math.floor(now / 1000)

      for (const type of ['requests', 'messages']) {
        const items = type === 'requests' ? requests : messages
        if (items.length === 0) continue

        const totalDuration = items.reduce((sum, d) => sum + d, 0)

        pipeline.zadd(this.getKey(`${type}:time`), bucket, bucket)
        pipeline.expire(this.getKey(`${type}:time`), TTL_SECONDS)
        pipeline.hincrby(this.getKey(`${type}:${bucket}`), 'count', items.length)
        pipeline.hincrby(this.getKey(`${type}:${bucket}`), 'totalDuration', totalDuration)
        pipeline.expire(this.getKey(`${type}:${bucket}`), TTL_SECONDS)

        // Add max duration as representative sample
        const maxDuration = Math.max(...items)
        pipeline.zadd(this.getKey(`${type}:responseTimes`), maxDuration, maxDuration)
        pipeline.expire(this.getKey(`${type}:responseTimes`), TTL_SECONDS)
      }

      await pipeline.exec()
    } catch (error) {
      // Silent fail - stats are not critical
    }
  }

  recordRequest (duration, isMessage = false) {
    // Non-blocking: just add to local batch
    const type = isMessage ? 'messages' : 'requests'
    this.batch[type].push(duration)
  }

  async updateQueueSize (size) {
    await redis.set(this.getKey('queue:pending'), size, 'EX', TTL_SECONDS)
  }

  async getStats () {
    const now = Date.now()
    const windowStart = now - WINDOW_SIZE_SEC * 1000

    const stats = {}

    for (const type of ['requests', 'messages']) {
      const [timeBuckets, responseTimes] = await Promise.all([
        redis.zrangebyscore(this.getKey(`${type}:time`), Math.floor(windowStart / 1000), '+inf'),
        redis.zrangebyscore(this.getKey(`${type}:responseTimes`), '-inf', '+inf')
      ])

      let totalCount = 0
      let totalDuration = 0

      await Promise.all(timeBuckets.map(async (bucket) => {
        const [count, duration] = await redis.hmget(this.getKey(`${type}:${bucket}`), 'count', 'totalDuration')
        totalCount += parseInt(count || 0)
        totalDuration += parseInt(duration || 0)
      }))

      const ratePerSecond = totalCount / WINDOW_SIZE_SEC
      const avgTime = totalCount > 0 ? totalDuration / totalCount : 0
      const percentile95 = responseTimes.length > 0
        ? parseFloat(responseTimes[Math.floor(responseTimes.length * 0.95)]) : 0

      stats[type] = {
        ratePerSecond,
        avgTime,
        percentile95
      }
    }

    const queuePending = parseInt(await redis.get(this.getKey('queue:pending')) || '0')

    return {
      requests: {
        rps: stats.requests.ratePerSecond,
        avgTime: stats.requests.avgTime,
        percentile95: stats.requests.percentile95
      },
      messages: {
        mps: stats.messages.ratePerSecond,
        avgTime: stats.messages.avgTime,
        percentile95: stats.messages.percentile95
      },
      queue: {
        pending: queuePending
      }
    }
  }

  async updateAndLogStats () {
    this.currentStats = await this.getStats()
    console.log('📊 Current stats:', this.currentStats)

    const now = new Date()
    if (now - this.lastUpdateTimestamp >= 60000) {
      await db.Stats.create({
        ...this.currentStats,
        date: now
      }).catch(err => console.error('Error saving stats:', err))
      this.lastUpdateTimestamp = now
    }
  }

  startPeriodicUpdate () {
    if (this.updateInterval) clearInterval(this.updateInterval)
    this.updateInterval = setInterval(() => this.updateAndLogStats(), UPDATE_INTERVAL_MS)

    // Single cleanup handler for all intervals
    process.once('SIGTERM', async () => {
      if (this.updateInterval) clearInterval(this.updateInterval)
      if (this.batchInterval) clearInterval(this.batchInterval)
      await this.flushBatch().catch(() => {})
    })
  }

  middleware () {
    return async (ctx, next) => {
      const startMs = Date.now()
      ctx.stats = this.currentStats

      try {
        await next()
      } finally {
        const duration = Date.now() - startMs
        const isMessage = !ctx.state.emptyRequest
        this.recordRequest(duration, isMessage) // Non-blocking
      }
    }
  }

  async getStatsForPeriod (startTime, endTime) {
    throw new Error('Not implemented')
  }
}

const statsInstance = new HighLoadStats()

module.exports = statsInstance

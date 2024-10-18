const { db } = require('../database')
const Redis = require('ioredis')

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
})

const WINDOW_SIZE_SEC = 60
const UPDATE_INTERVAL_MS = 1000 * 5
const TTL_SECONDS = 120 // 2 minutes TTL for all Redis keys
const KEY_PREFIX = 'quote:stats:' // Prefix for all Redis keys

class HighLoadStats {
  constructor () {
    this.lastUpdateTimestamp = Date.now()
    this.currentStats = {
      requests: {
        rps: 0,
        avgTime: 0,
        percentile95: 0
      },
      messages: {
        mps: 0,
        avgTime: 0,
        percentile95: 0
      },
      queue: {
        pending: 0
      }
    }
  }

  getKey (key) {
    return `${KEY_PREFIX}${key}`
  }

  async recordRequest (duration, isMessage = false) {
    const now = Date.now()
    const bucket = Math.floor(now / 1000)

    const type = isMessage ? 'messages' : 'requests'

    const pipeline = redis.pipeline()

    pipeline.zadd(this.getKey(`${type}:time`), bucket, bucket)
    pipeline.expire(this.getKey(`${type}:time`), TTL_SECONDS)

    pipeline.hincrby(this.getKey(`${type}:${bucket}`), 'count', 1)
    pipeline.hincrby(this.getKey(`${type}:${bucket}`), 'totalDuration', duration)
    pipeline.expire(this.getKey(`${type}:${bucket}`), TTL_SECONDS)

    pipeline.zadd(this.getKey(`${type}:responseTimes`), duration, duration)
    pipeline.expire(this.getKey(`${type}:responseTimes`), TTL_SECONDS)

    await pipeline.exec()
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
    setInterval(() => this.updateAndLogStats(), UPDATE_INTERVAL_MS)
  }

  middleware () {
    return async (ctx, next) => {
      const startMs = Date.now()

      ctx.stats = JSON.parse(JSON.stringify(this.currentStats))

      try {
        await next()
      } finally {
        const duration = Date.now() - startMs
        const isMessage = !ctx.state.emptyRequest
        await this.recordRequest(duration, isMessage)
      }
    }
  }

  async getStatsForPeriod (startTime, endTime) {
    throw new Error('Not implemented')
  }
}

const statsInstance = new HighLoadStats()

module.exports = statsInstance

const { db } = require('../database')
const Redis = require('ioredis')

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
})

const WINDOW_SIZE_SEC = 60
const UPDATE_INTERVAL_MS = 1000 * 5

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

  async recordRequest (duration, isMessage = false) {
    const now = Date.now()
    const bucket = Math.floor(now / 1000)

    const type = isMessage ? 'messages' : 'requests'

    await Promise.all([
      redis.zadd(`${type}:time`, bucket, bucket),
      redis.hincrby(`${type}:${bucket}`, 'count', 1),
      redis.hincrby(`${type}:${bucket}`, 'totalDuration', duration),
      redis.zadd(`${type}:responseTimes`, duration, duration)
    ])
  }

  async updateQueueSize (size) {
    await redis.set('queue:pending', size)
  }

  async getStats () {
    const now = Date.now()
    const windowStart = now - WINDOW_SIZE_SEC * 1000

    const stats = {}

    for (const type of ['requests', 'messages']) {
      const [timeBuckets, responseTimes] = await Promise.all([
        redis.zrangebyscore(`${type}:time`, Math.floor(windowStart / 1000), '+inf'),
        redis.zrangebyscore(`${type}:responseTimes`, '-inf', '+inf')
      ])

      let totalCount = 0
      let totalDuration = 0

      await Promise.all(timeBuckets.map(async (bucket) => {
        const [count, duration] = await redis.hmget(`${type}:${bucket}`, 'count', 'totalDuration')
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

    const queuePending = parseInt(await redis.get('queue:pending') || '0')

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

      // Додаємо поточну статистику до контексту
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
statsInstance.startPeriodicUpdate()

module.exports = statsInstance

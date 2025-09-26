require('dotenv').config({ path: './.env' })

const { Telegraf } = require('telegraf')
const Redis = require('ioredis')

const logWithTimestamp = (message) => {
  console.log(`[${new Date().toISOString()}] [COLLECTOR] ${message}`)
}

const errorWithTimestamp = (message, ...args) => {
  console.error(`[${new Date().toISOString()}] [COLLECTOR] ${message}`, ...args)
}

class TelegramCollector {
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN, {
      handlerTimeout: 1000 // Fast timeout for collector
    })

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })

    this.setupRedisEvents()
    this.setupBot()
  }

  setupRedisEvents() {
    this.redis.on('connect', () => {
      logWithTimestamp('Connected to Redis')
    })

    this.redis.on('error', (error) => {
      errorWithTimestamp('Redis error:', error.message)
    })

    this.redis.on('close', () => {
      logWithTimestamp('Redis connection closed')
    })
  }

  setupBot() {
    // Simple middleware to collect all updates
    this.bot.use(async (ctx, next) => {
      try {
        const update = ctx.update
        const updateId = update.update_id

        // Add timestamp and priority
        const enrichedUpdate = {
          ...update,
          collected_at: Date.now(),
          priority: this.getUpdatePriority(update)
        }

        // Push to Redis queue
        await this.redis.lpush('telegram:updates', JSON.stringify(enrichedUpdate))

        // Track metrics
        await this.redis.incr('telegram:collected_count')

        // Don't log each update - only batch stats

      } catch (error) {
        errorWithTimestamp('Error collecting update:', error.message)
        // Don't break the bot, continue processing
      }

      // Don't call next() - we only collect, don't process
    })

    // Error handling
    this.bot.catch((err, ctx) => {
      errorWithTimestamp('Bot error:', err.message)
    })
  }

  getUpdatePriority(update) {
    // Higher priority for commands
    if (update.message?.text?.startsWith('/')) {
      return 10
    }
    // Medium priority for replies
    if (update.message?.reply_to_message) {
      return 5
    }
    // Default priority
    return 1
  }

  async start() {
    try {
      await this.redis.connect()

      // Clear old stats
      await this.redis.set('telegram:collected_count', 0)

      logWithTimestamp('Starting Telegram collector...')
      await this.bot.launch()

      logWithTimestamp('Telegram collector started successfully')

      // Collector stats every 10 seconds
      setInterval(async () => {
        try {
          const collected = await this.redis.get('telegram:collected_count') || 0
          const queueSize = await this.redis.llen('telegram:updates')
          const avgPriority = await this.redis.get('telegram:avg_priority') || 1

          logWithTimestamp(`📊 COLLECTOR | Total: ${collected} | Queue: ${queueSize} | Avg Priority: ${avgPriority}`)
        } catch (error) {
          errorWithTimestamp('Stats error:', error.message)
        }
      }, 10000) // Every 10 seconds

    } catch (error) {
      errorWithTimestamp('Failed to start collector:', error.message)
      process.exit(1)
    }
  }

  async stop() {
    logWithTimestamp('Stopping collector...')
    this.bot.stop('SIGTERM')
    await this.redis.quit()
    logWithTimestamp('Collector stopped')
  }
}

// Create and start collector
const collector = new TelegramCollector()

// Graceful shutdown
process.once('SIGINT', () => collector.stop())
process.once('SIGTERM', () => collector.stop())

// Start the collector
collector.start()

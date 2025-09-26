require('dotenv').config({ path: './.env' })

const { Telegraf } = require('telegraf')
const Redis = require('ioredis')
const { db } = require('./database')
const { stats } = require('./middlewares')

const logWithTimestamp = (message) => {
  const workerId = process.env.pm_id || process.pid
  console.log(`[${new Date().toISOString()}] [WORKER-${workerId}] ${message}`)
}

const errorWithTimestamp = (message, ...args) => {
  const workerId = process.env.pm_id || process.pid
  console.error(`[${new Date().toISOString()}] [WORKER-${workerId}] ${message}`, ...args)
}

class TelegramProcessor {
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN, {
      handlerTimeout: 30000
    })

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })

    this.isProcessing = false
    this.processedCount = 0
    this.errorCount = 0

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
  }

  setupBot() {
    // Set up database and config context
    this.bot.use(async (ctx, next) => {
      ctx.db = db

      // Load config synchronously (cached)
      try {
        const fs = require('fs')
        if (fs.existsSync('./config.json')) {
          const configData = fs.readFileSync('./config.json', 'utf8')
          ctx.config = JSON.parse(configData)
        } else {
          ctx.config = {}
        }
      } catch (error) {
        ctx.config = {}
      }

      return next()
    })

    // Add TDLib proxy (simplified, use existing tdlib helper)
    this.bot.use(async (ctx, next) => {
      // Simplified TDLib - use existing helpers
      const tdlib = require('./helpers/tdlib')
      ctx.tdlib = tdlib
      return next()
    })

    // Add stats middleware
    this.bot.use(stats.middleware())

    // Add main handler
    const handler = require('./handler')
    this.bot.use(handler)

    // Error handling
    this.bot.catch((err, ctx) => {
      this.errorCount++
      errorWithTimestamp('Bot error:', err.message)
    })
  }

  async processUpdate(updateData) {
    try {
      const update = JSON.parse(updateData)

      // Add processing timestamp
      update._processor_started = Date.now()

      // Process through bot
      await this.bot.handleUpdate(update)

      this.processedCount++

      // Update processed counter
      await this.redis.incr('telegram:processed_count')

      logWithTimestamp(`Processed update ${update.update_id} (queue delay: ${Date.now() - update.collected_at}ms)`)

    } catch (error) {
      this.errorCount++
      errorWithTimestamp('Error processing update:', error.message)

      // Track error
      await this.redis.incr('telegram:error_count')
    }
  }

  async startProcessing() {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true
    logWithTimestamp('Starting update processing loop...')

    while (this.isProcessing) {
      try {
        // Blocking pop with 1 second timeout
        const result = await this.redis.brpop('telegram:updates', 1)

        if (result && result[1]) {
          await this.processUpdate(result[1])
        }

      } catch (error) {
        errorWithTimestamp('Processing loop error:', error.message)
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  async start() {
    try {
      await this.redis.connect()

      logWithTimestamp('Starting Telegram processor...')

      // Start processing loop
      this.startProcessing()

      // Periodic stats
      setInterval(async () => {
        try {
          const queueSize = await this.redis.llen('telegram:updates')
          const totalProcessed = await this.redis.get('telegram:processed_count') || 0
          const totalErrors = await this.redis.get('telegram:error_count') || 0

          logWithTimestamp(`Stats - Queue: ${queueSize}, Processed: ${totalProcessed}, Errors: ${totalErrors}`)
        } catch (error) {
          errorWithTimestamp('Stats error:', error.message)
        }
      }, 30000) // Every 30 seconds

      logWithTimestamp('Processor started successfully')

    } catch (error) {
      errorWithTimestamp('Failed to start processor:', error.message)
      process.exit(1)
    }
  }

  async stop() {
    logWithTimestamp('Stopping processor...')
    this.isProcessing = false
    await this.redis.quit()
    logWithTimestamp('Processor stopped')
  }
}

// Create and start processor
const processor = new TelegramProcessor()

// Graceful shutdown
process.once('SIGINT', () => processor.stop())
process.once('SIGTERM', () => processor.stop())

// Start the processor
processor.start()

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  errorWithTimestamp('Uncaught Exception:', error.message)
  processor.stop()
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  errorWithTimestamp('Unhandled Rejection at:', promise, 'reason:', reason)
})
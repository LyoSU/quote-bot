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
  constructor () {
    this.bot = new Telegraf(process.env.BOT_TOKEN, {
      handlerTimeout: 30000
    })

    // Single Redis connection for all operations
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

  setupRedisEvents () {
    this.redis.on('connect', () => {
      logWithTimestamp('Connected to Redis')
    })

    this.redis.on('error', (error) => {
      errorWithTimestamp('Redis error:', error.message)
    })
  }

  createTDLibProxy() {
    // Create proxy that sends TDLib requests through Redis
    return new Proxy({}, {
      get: (target, prop) => {
        return (...args) => {
          return new Promise((resolve, reject) => {
            const requestId = Date.now() + Math.random()

            // Send request through Redis
            const request = {
              id: requestId,
              method: prop,
              args: args
            }

            this.redis.publish('tdlib:requests', JSON.stringify(request))

            // Listen for response (simplified)
            const responseHandler = (channel, message) => {
              if (channel === 'tdlib:responses') {
                try {
                  const response = JSON.parse(message)
                  if (response.id === requestId) {
                    if (response.error) {
                      reject(new Error(response.error))
                    } else {
                      resolve(response.result)
                    }
                  }
                } catch (error) {
                  // Ignore parse errors
                }
              }
            }

            this.redis.on('message', responseHandler)

            // Timeout after 5 seconds
            setTimeout(() => {
              reject(new Error(`TDLib ${prop} timeout`))
            }, 5000)
          })
        }
      }
    })
  }

  setupBot () {
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

    // TDLib proxy through Redis IPC (like old architecture)
    this.bot.use(async (ctx, next) => {
      ctx.tdlib = this.createTDLibProxy()
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

  async processUpdate (updateData) {
    try {
      const update = JSON.parse(updateData)

      // Add processing timestamp
      update._processor_started = Date.now()

      // Process through bot
      await this.bot.handleUpdate(update)

      this.processedCount++

      // Track locally only
      // Can't use redis incr in subscriber mode

      // Don't log each update - only batch stats
    } catch (error) {
      this.errorCount++
      errorWithTimestamp('Error processing update:', error.message)

      // Track error locally only
    }
  }

  async startProcessing () {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true
    logWithTimestamp('Starting update processing via pub/sub...')

    // Subscribe to updates and TDLib responses
    await this.redis.subscribe('telegram:updates', 'tdlib:responses')

    this.redis.on('message', async (channel, message) => {
      if (channel === 'telegram:updates' && this.isProcessing) {
        try {
          await this.processUpdate(message)
        } catch (error) {
          errorWithTimestamp('Processing error:', error.message)
        }
      }
      // TDLib responses handled in proxy
    })
  }

  async start () {
    try {
      await this.redis.connect()

      logWithTimestamp('Starting Telegram processor...')

      // Start processing loop
      this.startProcessing()

      // Worker stats every 10 seconds
      setInterval(async () => {
        const workerId = process.env.pm_id || process.pid
        const status = this.isProcessing ? 'active' : 'idle'

        logWithTimestamp(`⚡ WORKER-${workerId} | Local Processed: ${this.processedCount} | Local Errors: ${this.errorCount} | Status: ${status}`)
      }, 10000) // Every 10 seconds

      logWithTimestamp('Processor started successfully')
    } catch (error) {
      errorWithTimestamp('Failed to start processor:', error.message)
      process.exit(1)
    }
  }

  async stop () {
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

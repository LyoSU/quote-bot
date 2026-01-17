require('dotenv').config({ path: './.env' })

const fs = require('fs')
const { Telegraf } = require('telegraf')
const { createRedisClient } = require('./utils/redis')
const { db } = require('./database')
const { stats } = require('./middlewares')

// Cache config at startup
let cachedConfig = {}
try {
  if (fs.existsSync('./config.json')) {
    cachedConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
  }
} catch (error) {
  console.error('Error loading config:', error.message)
}

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

    // Main Redis connection for queue and stats
    this.redis = createRedisClient({
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    })

    // Separate connection for TDLib pub/sub
    this.tdlibRedis = createRedisClient({
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    })

    this.isProcessing = false
    this.processedCount = 0
    this.errorCount = 0
    this.concurrentLimit = 50 // Process up to 50 updates concurrently per worker
    this.activePromises = new Set() // Track active processing promises
    this.workerId = process.env.WORKER_INDEX || process.env.pm_id || process.pid
    this.workerIndex = process.env.WORKER_INDEX !== undefined ? parseInt(process.env.WORKER_INDEX) : (this.workerId % 3)
    this.queueName = `telegram:updates:worker:${this.workerIndex}`
    this.pendingTDLibRequests = new Map() // Track pending TDLib requests

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

    // Setup TDLib response handler once
    this.tdlibRedis.on('message', (channel, message) => {
      if (channel === 'tdlib:responses') {
        try {
          const response = JSON.parse(message)
          const pending = this.pendingTDLibRequests.get(response.id)
          if (pending) {
            this.pendingTDLibRequests.delete(response.id)
            clearTimeout(pending.timeout)
            if (response.error) {
              pending.reject(new Error(response.error))
            } else {
              pending.resolve(response.result)
            }
          }
        } catch (error) {
          // Ignore parse errors
        }
      }
    })
  }

  createTDLibProxy () {
    // Create proxy that sends TDLib requests through Redis
    return new Proxy({}, {
      get: (target, prop) => {
        return (...args) => {
          return new Promise((resolve, reject) => {
            const requestId = `${this.workerId}-${Date.now()}-${Math.random()}`

            // Send request through Redis
            const request = {
              id: requestId,
              method: prop,
              args: args
            }

            // Set timeout
            const timeout = setTimeout(() => {
              this.pendingTDLibRequests.delete(requestId)
              reject(new Error(`TDLib ${prop} timeout`))
            }, 5000)

            // Store pending request
            this.pendingTDLibRequests.set(requestId, { resolve, reject, timeout })

            // Publish request
            this.redis.publish('tdlib:requests', JSON.stringify(request))
          })
        }
      }
    })
  }

  setupBot () {
    // Set up database and config context
    this.bot.use(async (ctx, next) => {
      ctx.db = db
      ctx.config = cachedConfig
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

      // Update global processed counter
      await this.redis.incr('telegram:processed_count')

      // Don't log each update - only batch stats
    } catch (error) {
      this.errorCount++
      errorWithTimestamp('Error processing update:', error.message)

      // Track error globally
      await this.redis.incr('telegram:error_count')
    }
  }

  async startProcessing () {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true
    logWithTimestamp(`Starting concurrent processing (limit: ${this.concurrentLimit})...`)

    while (this.isProcessing) {
      try {
        // Only get new update if we have capacity
        if (this.activePromises.size < this.concurrentLimit) {
          const result = await this.redis.brpop(this.queueName, 1)

          if (result && result[1]) {
            // Start processing concurrently (don't await)
            const processPromise = this.processUpdate(result[1])
              .then(() => {
                this.activePromises.delete(processPromise)
              })
              .catch((error) => {
                this.activePromises.delete(processPromise)
                errorWithTimestamp('Concurrent processing error:', error.message)
              })

            this.activePromises.add(processPromise)
          }
        } else {
          // Wait for at least one promise to complete
          await Promise.race(this.activePromises)
        }
      } catch (error) {
        errorWithTimestamp('Processing loop error:', error.message)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Wait for all active promises to complete before stopping
    if (this.activePromises.size > 0) {
      logWithTimestamp(`Waiting for ${this.activePromises.size} active processes to complete...`)
      await Promise.allSettled(this.activePromises)
    }
  }

  async start () {
    try {
      // Wait for database to be ready before processing
      logWithTimestamp('Waiting for MongoDB connection...')
      await db.ready
      logWithTimestamp('MongoDB connected')

      await this.redis.connect()
      await this.tdlibRedis.connect()

      // Subscribe to TDLib responses once after connection
      await this.tdlibRedis.subscribe('tdlib:responses')

      logWithTimestamp(`Starting Telegram processor (Worker ${this.workerId}[${this.workerIndex}] -> ${this.queueName})...`)

      // Start processing loop
      this.startProcessing()

      // Worker stats every 10 seconds
      setInterval(async () => {
        try {
          const queueSize = await this.redis.llen(this.queueName)
          const totalProcessed = await this.redis.get('telegram:processed_count') || 0
          const totalErrors = await this.redis.get('telegram:error_count') || 0
          const activeCount = this.activePromises.size

          logWithTimestamp(`⚡ [${this.workerIndex}] | Queue: ${queueSize} | Processed: ${totalProcessed} | Errors: ${totalErrors} | Active: ${activeCount}/${this.concurrentLimit}`)
        } catch (error) {
          errorWithTimestamp('Stats error:', error.message)
        }
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
    await this.tdlibRedis.quit()
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

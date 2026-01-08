require('dotenv').config({ path: './.env' })

const { Telegraf } = require('telegraf')
const { createRedisClient } = require('./utils/redis')
const StickerStatsPublisher = require('./services/sticker-stats-publisher')

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

    // Single Redis connection for all operations
    this.redis = createRedisClient({
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
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

        // Get chat ID for consistent worker assignment
        const chatId = this.getChatId(update)
        const workerIndex = Math.abs(chatId) % 3 // 3 workers from docker-compose
        const queueName = `telegram:updates:worker:${workerIndex}`

        // Push to specific worker queue
        await this.redis.lpush(queueName, JSON.stringify(enrichedUpdate))

        // Track globally in Redis
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

  startTDLibServer() {
    // Initialize TDLib only in collector process
    const tdlib = require('./helpers/tdlib')

    // Create separate connection for TDLib pub/sub
    this.tdlibRedis = createRedisClient({
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: false
    })

    // Subscribe to TDLib requests from workers
    this.tdlibRedis.subscribe('tdlib:requests')

    this.tdlibRedis.on('message', async (channel, message) => {
      if (channel === 'tdlib:requests') {
        try {
          const request = JSON.parse(message)

          try {
            const result = await tdlib[request.method](...request.args)

            // Send response back
            this.redis.publish('tdlib:responses', JSON.stringify({
              id: request.id,
              result: result
            }))

          } catch (error) {
            // Send error response
            this.redis.publish('tdlib:responses', JSON.stringify({
              id: request.id,
              error: error.message
            }))
          }

        } catch (parseError) {
          logWithTimestamp('TDLib request parse error:', parseError.message)
        }
      }
    })

    logWithTimestamp('TDLib server started (centralized)')
  }

  getChatId(update) {
    // Extract chat ID from various update types
    if (update.message) return update.message.chat.id
    if (update.edited_message) return update.edited_message.chat.id
    if (update.channel_post) return update.channel_post.chat.id
    if (update.edited_channel_post) return update.edited_channel_post.chat.id
    if (update.callback_query) return update.callback_query.message?.chat?.id || update.callback_query.from.id
    if (update.inline_query) return update.inline_query.from.id
    if (update.chosen_inline_result) return update.chosen_inline_result.from.id
    if (update.shipping_query) return update.shipping_query.from.id
    if (update.pre_checkout_query) return update.pre_checkout_query.from.id

    // Fallback to update_id if no chat found
    return update.update_id
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

      // Clear worker queues and reset stats
      for (let i = 0; i < 3; i++) {
        await this.redis.del(`telegram:updates:worker:${i}`)
      }
      await this.redis.set('telegram:collected_count', 0)

      // Start TDLib server
      this.startTDLibServer()

      // Start sticker stats publisher
      this.stickerPublisher = new StickerStatsPublisher({
        redis: this.redis
      })
      this.stickerPublisher.start()
      logWithTimestamp('Sticker stats publisher started')

      logWithTimestamp('Starting Telegram collector...')
      await this.bot.launch()

      logWithTimestamp('Telegram collector started successfully')

      // Collector stats every 10 seconds
      setInterval(async () => {
        try {
          const collected = await this.redis.get('telegram:collected_count') || 0

          // Get queue sizes for all workers
          const queueSizes = []
          for (let i = 0; i < 3; i++) {
            const size = await this.redis.llen(`telegram:updates:worker:${i}`)
            queueSizes.push(size)
          }
          const totalQueue = queueSizes.reduce((a, b) => a + b, 0)

          logWithTimestamp(`Collected: ${collected} | Total Queue: ${totalQueue} | Workers: [${queueSizes.join(',')}]`)
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
    if (this.stickerPublisher) {
      this.stickerPublisher.stop()
    }
    this.bot.stop('SIGTERM')
    await this.redis.quit()
    if (this.tdlibRedis) await this.tdlibRedis.quit()
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

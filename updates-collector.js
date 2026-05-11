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

// Number of Redis queues the collector shards updates into. MUST match the
// number of worker instances (see ecosystem.config.js); divergence wedges
// updates whose chatId hashes into an unread queue.
const WORKER_QUEUES = parseInt(process.env.WORKER_QUEUES, 10) || 3

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
        const workerIndex = Math.abs(chatId) % WORKER_QUEUES
        const queueName = `telegram:updates:worker:${workerIndex}`

        // Push to specific worker queue
        await this.redis.lpush(queueName, JSON.stringify(enrichedUpdate))

        // Track globally in Redis
        await this.redis.incr('telegram:collected_count')

        // Guest mode is a new (Bot API 10.0) and rare path — surface every
        // arrival so we can correlate "user mentioned bot" with "did the
        // pipeline see it". One line per mention; low volume in practice.
        if (update.guest_message) {
          const gm = update.guest_message
          logWithTimestamp(`[guest] update_id=${update.update_id} qid=${gm.guest_query_id} from=${gm.from?.id} chat=${gm.chat?.id} hasReply=${!!gm.reply_to_message} → queue ${workerIndex}`)
        }

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
    if (update.business_message) return update.business_message.chat?.id || update.business_message.from?.id
    // Guest mode (Bot API 10.0): the inbound guest_message carries the
    // summoning user/chat in the standard `from`/`chat` Message fields
    // — `guest_bot_caller_*` are only set on OUTBOUND messages the bot
    // sends via answerGuestQuery. Hash by chat for cache locality.
    if (update.guest_message) {
      return update.guest_message.chat?.id || update.guest_message.from?.id
    }

    // Fallback to update_id if no chat found
    return update.update_id
  }

  getUpdatePriority(update) {
    // Higher priority for commands
    if (update.message?.text?.startsWith('/')) {
      return 10
    }
    // Guest queries have a hard server-side TTL (~30s) — bump them above
    // ordinary text so they don't starve behind a backlog.
    if (update.guest_message) {
      return 9
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
      for (let i = 0; i < WORKER_QUEUES; i++) {
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

      logWithTimestamp(`Starting Telegram collector... (WORKER_QUEUES=${WORKER_QUEUES})`)
      // Bot API 10.0 introduced `guest_message`, which (like `business_*`) is
      // NOT included in the default allowed_updates set. We must enumerate
      // everything we want explicitly — omitting a type silently drops it.
      const allowedUpdates = [
        'message',
        'edited_message',
        'channel_post',
        'edited_channel_post',
        'business_connection',
        'business_message',
        'edited_business_message',
        'deleted_business_messages',
        'message_reaction',
        'message_reaction_count',
        'inline_query',
        'chosen_inline_result',
        'callback_query',
        'shipping_query',
        'pre_checkout_query',
        'poll',
        'poll_answer',
        'my_chat_member',
        'chat_member',
        'chat_join_request',
        'chat_boost',
        'removed_chat_boost',
        'guest_message'
      ]
      await this.bot.launch({ polling: { allowedUpdates } })

      logWithTimestamp('Telegram collector started successfully')

      // Collector stats every 10 seconds
      setInterval(async () => {
        try {
          const collected = await this.redis.get('telegram:collected_count') || 0

          // Get queue sizes for all workers
          const queueSizes = []
          for (let i = 0; i < WORKER_QUEUES; i++) {
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
    this.bot.stop()
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

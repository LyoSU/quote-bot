const { Bot } = require('grammy')
const cluster = require('cluster')
const { QueueManager } = require('./queueManager')
const numCPUs = require('os').cpus().length

const BOT_TOKEN = process.env.BOT_TOKEN
const MAX_WORKERS = process.env.MAX_WORKERS || numCPUs
const MAX_UPDATES_PER_WORKER = 10
const MAX_QUEUE_SIZE = 1000
const QUEUE_WARNING_THRESHOLD = 0.8
const PAUSE_THRESHOLD = 0.9
const RESUME_THRESHOLD = 0.7

let bot = null
let botInfo = null

if (cluster.isMaster) {
  const { setupMaster } = require('./master')

  bot = new Bot(BOT_TOKEN, {
    client: {
      buildTimeout: 10000,
      canUseWebhookReply: false,
      apiRoot: 'https://api.telegram.org'
    }
  })

  // Get bot info before setting up workers
  bot.api.getMe().then(info => {
    botInfo = info
    const queueManager = new QueueManager(MAX_QUEUE_SIZE, QUEUE_WARNING_THRESHOLD, PAUSE_THRESHOLD, RESUME_THRESHOLD)

    // Pass botInfo to setupMaster
    setupMaster(bot, queueManager, MAX_WORKERS, MAX_UPDATES_PER_WORKER, botInfo)

    // Start polling after setup
    return bot.start()
  }).catch(err => {
    console.error('Failed to start bot:', err)
    process.exit(1)
  })

  const stopBot = async () => {
    console.log('Stopping bot...')
    if (bot) {
      await bot.stop()
    }
    process.exit(0)
  }

  process.once('SIGINT', stopBot)
  process.once('SIGTERM', stopBot)
} else {
  const { setupWorker } = require('./worker')
  // Worker processes will receive botInfo through messages
  setupWorker(BOT_TOKEN)
}

// Export bot instance if needed
module.exports = { bot }

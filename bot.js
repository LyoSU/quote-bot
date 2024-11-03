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

if (cluster.isMaster) {
  const { setupMaster } = require('./master')

  const bot = new Bot(BOT_TOKEN)

  if (!(bot instanceof Bot)) {
    throw new Error('Bot must be an instance of Bot')
  }

  const queueManager = new QueueManager(MAX_QUEUE_SIZE, QUEUE_WARNING_THRESHOLD, PAUSE_THRESHOLD, RESUME_THRESHOLD)

  setupMaster(bot, queueManager, MAX_WORKERS, MAX_UPDATES_PER_WORKER)

  bot.start()

  // Graceful stop
  const stopBot = () => bot.stop()
  process.once('SIGINT', stopBot)
  process.once('SIGTERM', stopBot)
} else {
  const { setupWorker } = require('./worker')

  setupWorker(BOT_TOKEN)
}

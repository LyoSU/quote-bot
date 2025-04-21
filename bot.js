const { Telegraf } = require('telegraf')
const cluster = require('cluster')
const { QueueManager } = require('./queueManager')
const numCPUs = require('os').cpus().length

const BOT_TOKEN = process.env.BOT_TOKEN
const MAX_WORKERS = process.env.MAX_WORKERS || numCPUs
const MAX_UPDATES_PER_WORKER = 100
const MAX_QUEUE_SIZE = 3000
const QUEUE_WARNING_THRESHOLD = 0.8
const PAUSE_THRESHOLD = 0.9
const RESUME_THRESHOLD = 0.7

if (cluster.isMaster) {
  const { setupMaster } = require('./master')

  const bot = new Telegraf(BOT_TOKEN, {
    handlerTimeout: 100
  })

  if (!(bot instanceof Telegraf)) {
    throw new Error('Не вдалося створити екземпляр Telegraf')
  }

  const queueManager = new QueueManager(MAX_QUEUE_SIZE, QUEUE_WARNING_THRESHOLD, PAUSE_THRESHOLD, RESUME_THRESHOLD)

  setupMaster(bot, queueManager, MAX_WORKERS, MAX_UPDATES_PER_WORKER)

  bot.launch()

  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
} else {
  const { setupWorker } = require('./worker')

  setupWorker(BOT_TOKEN)
}

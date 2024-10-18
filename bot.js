const { Telegraf } = require('telegraf')
const cluster = require('cluster')
const { QueueManager } = require('./queueManager')
const { setupMaster } = require('./master')
const { setupWorker } = require('./worker')

const BOT_TOKEN = process.env.BOT_TOKEN
const MAX_UPDATES_PER_WORKER = 30
const MAX_QUEUE_SIZE = 10000
const QUEUE_WARNING_THRESHOLD = 0.8
const PAUSE_THRESHOLD = 0.9
const RESUME_THRESHOLD = 0.7
const PAUSE_DURATION = 10000

if (cluster.isMaster) {
  const bot = new Telegraf(BOT_TOKEN, {
    handlerTimeout: 100
  })

  const queueManager = new QueueManager(MAX_QUEUE_SIZE, QUEUE_WARNING_THRESHOLD, PAUSE_THRESHOLD, RESUME_THRESHOLD, PAUSE_DURATION)

  setupMaster(bot, queueManager, MAX_UPDATES_PER_WORKER)

  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
} else {
  setupWorker(BOT_TOKEN)
}

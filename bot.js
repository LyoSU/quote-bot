const fs = require('fs')
const { Telegraf } = require('telegraf')
const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const { db } = require('./database')
const { stats } = require('./middlewares')

const BOT_TOKEN = process.env.BOT_TOKEN

if (cluster.isMaster) {
  const { tdlib } = require('./helpers')

  console.log(`Master process ${process.pid} is running`)

  stats.startPeriodicUpdate()

  const bot = new Telegraf(BOT_TOKEN, {
    handlerTimeout: 10
  })

  const workers = []
  const forwardGroups = new Map()

  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork()
    workers.push({ worker, load: 0 })
  }

  // eslint-disable-next-line no-inner-declarations
  function distributeUpdate (update) {
    const leastLoadedWorker = workers.reduce((min, w) => w.load < min.load ? w : min, workers[0])
    leastLoadedWorker.worker.send({ type: 'UPDATE', payload: update })
    leastLoadedWorker.load++
  }

  bot.use((ctx, next) => {
    const update = ctx.update
    if (update.message && update.message.forward_date) {
      const chatId = update.message.chat.id
      if (!forwardGroups.has(chatId)) {
        forwardGroups.set(chatId, [])
        setTimeout(() => {
          const updates = forwardGroups.get(chatId)
          if (updates && updates.length > 0) {
            distributeUpdate(updates[0])
            forwardGroups.delete(chatId)
          }
        }, 1000)
      }
      forwardGroups.get(chatId).push(update)
    } else {
      distributeUpdate(update)
    }
    return next()
  })

  bot.launch({
    polling: {
      allowedUpdates: [
        'message',
        'edited_message',
        'channel_post',
        'edited_channel_post',
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
        'business_message'
      ]
    }
  }).then(() => {
    console.log('Bot started polling')
  })

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`)
    const newWorker = cluster.fork()
    workers.splice(workers.findIndex(w => w.worker === worker), 1, { worker: newWorker, load: 0 })
  })

  workers.forEach(({ worker }) => {
    worker.on('message', async (msg) => {
      if (msg.type === 'TASK_COMPLETED') {
        const workerData = workers.find(w => w.worker === worker)
        if (workerData) {
          workerData.load--
        }
      } else if (msg.type === 'SEND_MESSAGE') {
        bot.telegram.sendMessage(msg.chatId, msg.text)
      } else if (msg.type === 'TDLIB_REQUEST') {
        try {
          const result = await tdlib[msg.method](...msg.args)
          worker.send({ type: 'TDLIB_RESPONSE', id: msg.id, result })
        } catch (error) {
          worker.send({ type: 'TDLIB_RESPONSE', id: msg.id, error: error.message })
        }
      }
    })
  })

  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
} else {
  const handler = require('./handler')

  console.log(`Worker ${process.pid} started`)

  const tdlibProxy = new Proxy({}, {
    get (target, prop) {
      return (...args) => {
        return new Promise((resolve, reject) => {
          const id = Date.now() + Math.random()
          process.send({ type: 'TDLIB_REQUEST', method: prop, args, id })

          const handler = (msg) => {
            if (msg.type === 'TDLIB_RESPONSE' && msg.id === id) {
              process.removeListener('message', handler)
              if (msg.error) {
                reject(new Error(msg.error))
              } else {
                resolve(msg.result)
              }
            }
          }

          process.on('message', handler)
        })
      }
    }
  })

  const bot = new Telegraf(BOT_TOKEN)

  bot.use((ctx, next) => {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
    ctx.config = config
    ctx.db = db
    ctx.tdlib = tdlibProxy // Use the proxy instead of the actual tdlib
    return next()
  })

  bot.use(stats.middleware())

  bot.use(handler)

  // Handle updates in the worker
  process.on('message', async (msg) => {
    if (msg.type === 'UPDATE') {
      try {
        await bot.handleUpdate(msg.payload)
      } catch (error) {
        console.error('Error processing update in worker:', error)
      }
    }
  })
}

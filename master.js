const cluster = require('cluster')
const { stats } = require('./middlewares')

function setupMaster (bot, queueManager, maxWorkers, maxUpdatesPerWorker) {
  const tdlib = require('./helpers/tdlib')

  console.log(`Master process ${process.pid} is running`)

  stats.startPeriodicUpdate()

  const workers = []
  const forwardGroups = new Map()

  for (let i = 0; i < maxWorkers; i++) {
    const worker = cluster.fork()
    workers.push({ worker, load: 0 })
  }

  function distributeUpdate (update) {
    if (queueManager.isPaused()) {
      return
    }

    const availableWorker = workers.find(w => w.load < maxUpdatesPerWorker)
    if (availableWorker) {
      availableWorker.worker.send({ type: 'UPDATE', payload: update })
      availableWorker.load++
    } else {
      queueManager.addToQueue(update)
    }
  }

  function processQueue () {
    while (queueManager.hasUpdates()) {
      const availableWorker = workers.find(w => w.load < maxUpdatesPerWorker)
      if (availableWorker) {
        const update = queueManager.getNextUpdate()
        availableWorker.worker.send({ type: 'UPDATE', payload: update })
        availableWorker.load++
      } else {
        break
      }
    }

    if (queueManager.shouldResume()) {
      queueManager.resumeUpdates()
    }
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
        }, 100)
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
          processQueue()
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

  // Load monitoring
  setInterval(() => {
    const totalLoad = workers.reduce((sum, w) => sum + w.load, 0)
    const queueStatus = queueManager.getStatus()
    console.log(`Total worker load: ${totalLoad}, ${queueStatus}`)

    if (totalLoad === workers.length * maxUpdatesPerWorker && queueManager.hasUpdates()) {
      console.warn('System under high load: All workers at max capacity and queue not empty')
      // Add logic here for notifying admin or auto-scaling
    }
  }, 5000)
}

module.exports = { setupMaster }

const cluster = require('cluster')
const { stats } = require('./middlewares')

function setupMaster (bot, queueManager, maxWorkers, maxUpdatesPerWorker) {
  const tdlib = require('./helpers/tdlib')

  console.log(`Master process ${process.pid} is running`)

  stats.startPeriodicUpdate()

  const workers = []

  for (let i = 0; i < maxWorkers; i++) {
    const worker = cluster.fork()
    workers.push({ worker, load: 0 })
  }

  function getUpdateIdentifier(update) {
    // Priority: from user ID > chat ID > fallback to random
    if (update.message?.from?.id) {
      return `user_${update.message.from.id}`
    }
    if (update.message?.chat?.id) {
      return `chat_${update.message.chat.id}`
    }
    return `random_${Math.random()}`
  }

  function getWorkerForId(identifier) {
    // Simple but consistent hash function
    const hash = String(identifier).split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    return workers[hash % workers.length]
  }

  function distributeUpdate (update) {
    if (!queueManager.isPaused()) {
      const identifier = getUpdateIdentifier(update)
      const targetWorker = getWorkerForId(identifier)

      if (targetWorker.load < maxUpdatesPerWorker) {
        targetWorker.worker.send({ type: 'UPDATE', payload: update })
        targetWorker.load++
      } else {
        queueManager.addToQueue({ update, workerId: workers.indexOf(targetWorker) })
      }
    } else {
      const identifier = getUpdateIdentifier(update)
      const targetWorker = getWorkerForId(identifier)
      queueManager.addToQueue({ update, workerId: workers.indexOf(targetWorker) })
    }
  }

  function processQueue () {
    while (queueManager.hasUpdates()) {
      const nextItem = queueManager.peekNextUpdate()
      const targetWorker = workers[nextItem.workerId]

      if (targetWorker && targetWorker.load < maxUpdatesPerWorker) {
        const item = queueManager.getNextUpdate()
        targetWorker.worker.send({ type: 'UPDATE', payload: item.update })
        targetWorker.load++
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
    distributeUpdate(update)
    return next()
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

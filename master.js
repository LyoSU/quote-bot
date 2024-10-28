const cluster = require('cluster')
const { stats } = require('./middlewares')

function setupMaster (bot, queueManager, maxWorkers, maxUpdatesPerWorker) {
  const tdlib = require('./helpers/tdlib')

  console.log(`Master process ${process.pid} is running`)

  stats.startPeriodicUpdate()

  const workers = []
  // eslint-disable-next-line no-unused-vars
  const forwardGroups = new Map()

  for (let i = 0; i < maxWorkers; i++) {
    const worker = cluster.fork()
    workers.push({ worker, load: 0 })
  }

  function distributeUpdate (update) {
    if (!queueManager.isPaused()) {
      const availableWorker = workers.find(w => w.load < maxUpdatesPerWorker)
      if (availableWorker) {
        availableWorker.worker.send({ type: 'UPDATE', payload: update })
        availableWorker.load++
      } else {
        queueManager.addToQueue(update)
      }
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

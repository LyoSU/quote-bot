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

  function getConsistentWorker(id) {
    // Simple but effective way to map IDs to workers
    const workerIndex = Math.abs(id) % workers.length
    return workers[workerIndex]
  }

  function distributeUpdate(ctx) {
    // Get ID directly from ctx
    const id = (ctx.from?.id ||
                ctx.chat?.id ||
                Math.random() * 1000000) // fallback if neither exists

    if (!queueManager.isPaused()) {
      const targetWorker = getConsistentWorker(id)
      if (targetWorker.load < maxUpdatesPerWorker) {
        targetWorker.worker.send({ type: 'UPDATE', payload: ctx.update })
        targetWorker.load++
      } else {
        queueManager.addToQueue(ctx)
      }
    } else {
      queueManager.addToQueue(ctx)
    }
  }

  function processQueue() {
    try {
      while (queueManager.hasUpdates()) {
        const ctx = queueManager.getNextUpdate()
        if (!ctx) continue;

        const id = (ctx.from?.id ||
                  ctx.chat?.id ||
                  Math.random() * 1000000)

        const targetWorker = getConsistentWorker(id)
        if (targetWorker.load < maxUpdatesPerWorker) {
          targetWorker.worker.send({ type: 'UPDATE', payload: ctx.update })
          targetWorker.load++
        } else {
          // Put the update back in queue if worker is at capacity
          queueManager.addToQueue(ctx)
          break
        }
      }

      if (queueManager.shouldResume()) {
        queueManager.resumeUpdates()
      }
    } catch (error) {
      console.error('Error processing queue:', error)
    }
  }

  bot.use((ctx, next) => {
    distributeUpdate(ctx)
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

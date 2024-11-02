const cluster = require('cluster')
const { stats } = require('./middlewares')

// Update priorities
const UPDATE_PRIORITIES = {
  COMMAND: 1,
  DEFAULT: 0
}

// Update identifier prefixes
const ID_PREFIXES = {
  USER: 'user_',
  CHAT: 'chat_',
  RANDOM: 'random_'
}

// Message types
const MESSAGE_TYPES = {
  UPDATE: 'UPDATE',
  TASK_COMPLETED: 'TASK_COMPLETED',
  SEND_MESSAGE: 'SEND_MESSAGE',
  TDLIB_REQUEST: 'TDLIB_REQUEST',
  TDLIB_RESPONSE: 'TDLIB_RESPONSE'
}

// Monitoring
const LOAD_CHECK_INTERVAL = 5000

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
      return `${ID_PREFIXES.USER}${update.message.from.id}`
    }
    if (update.message?.chat?.id) {
      return `${ID_PREFIXES.CHAT}${update.message.chat.id}`
    }
    return `${ID_PREFIXES.RANDOM}${Math.random()}`
  }

  // Add update priority determination
  function getUpdatePriority(update) {
    if (update.message?.text?.startsWith('/')) {
      return UPDATE_PRIORITIES.COMMAND
    }
    return UPDATE_PRIORITIES.DEFAULT
  }

  function getWorkerForId(identifier) {
    // Simple but consistent hash function
    const hash = String(identifier).split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    return workers[hash % workers.length]
  }

  // Modify distributeUpdate function
  function distributeUpdate (update) {
    if (!queueManager.isPaused()) {
      const identifier = getUpdateIdentifier(update)
      const targetWorker = getWorkerForId(identifier)
      const priority = getUpdatePriority(update) // Get priority

      if (targetWorker.load < maxUpdatesPerWorker) {
        targetWorker.worker.send({ type: MESSAGE_TYPES.UPDATE, payload: update })
        targetWorker.load++
      } else {
        // Add to queue with priority
        queueManager.addToQueue({
          update,
          workerIndex: workers.indexOf(targetWorker),
          priority
        })
      }
    } else {
      const identifier = getUpdateIdentifier(update)
      const targetWorker = getWorkerForId(identifier)
      const priority = getUpdatePriority(update) // Get priority
      // Add to queue with priority
      queueManager.addToQueue({
        update,
        workerIndex: workers.indexOf(targetWorker),
        priority
      })
    }
  }

  // Modify processQueue function to consider priorities
  function processQueue () {
    while (queueManager.hasUpdates()) {
      const nextItem = queueManager.getNextUpdate() // Returns update with highest priority
      const targetWorker = workers[nextItem.workerIndex]

      if (targetWorker && targetWorker.load < maxUpdatesPerWorker) {
        targetWorker.worker.send({ type: MESSAGE_TYPES.UPDATE, payload: nextItem.update })
        targetWorker.load++
      } else {
        // Return update back to queue
        queueManager.addToQueue(nextItem)
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
      if (msg.type === MESSAGE_TYPES.TASK_COMPLETED) {
        const workerData = workers.find(w => w.worker === worker)
        if (workerData) {
          workerData.load--
          processQueue()
        }
      } else if (msg.type === MESSAGE_TYPES.SEND_MESSAGE) {
        bot.telegram.sendMessage(msg.chatId, msg.text)
      } else if (msg.type === MESSAGE_TYPES.TDLIB_REQUEST) {
        try {
          const result = await tdlib[msg.method](...msg.args)
          worker.send({ type: MESSAGE_TYPES.TDLIB_RESPONSE, id: msg.id, result })
        } catch (error) {
          worker.send({ type: MESSAGE_TYPES.TDLIB_RESPONSE, id: msg.id, error: error.message })
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
  }, LOAD_CHECK_INTERVAL)
}

module.exports = { setupMaster }

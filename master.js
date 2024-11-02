const cluster = require('cluster')
const { stats } = require('./middlewares')

function getUpdateId(ctx) {
  return ctx.from?.id || ctx.chat?.id || null
}

function serializeContext(ctx) {
  // Only send necessary data to workers
  return {
    update: ctx.update,
    state: ctx.state,
    chat: ctx.chat,
    from: ctx.from,
    message: ctx.message
  }
}

function setupMaster(bot, queueManager, maxWorkers, maxUpdatesPerWorker) {
  const tdlib = require('./helpers/tdlib')

  console.log(`Master process ${process.pid} is running`)
  stats.startPeriodicUpdate()

  const workers = []
  const activeTasks = new Map() // Track tasks being processed

  for (let i = 0; i < maxWorkers; i++) {
    const worker = cluster.fork()
    workers.push({ worker, load: 0 })
  }

  function getWorkerForId(id) {
    if (!id) return null
    // Simple but effective distribution - ensures same ID always goes to same worker
    return Math.abs(id) % maxWorkers
  }

  function distributeUpdate(ctx) {
    try {
      const updateId = ctx.update.update_id
      const timeoutId = setTimeout(() => {
        if (activeTasks.has(updateId)) {
          console.warn(`Task ${updateId} timed out, requeueing...`)
          queueManager.addToQueue(ctx)
          const { timeout } = activeTasks.get(updateId);
          clearTimeout(timeout);
          activeTasks.delete(updateId)
        }
      }, 30000) // 30 second timeout

      if (queueManager.isPaused()) {
        queueManager.addToQueue(ctx)
        return
      }

      const id = getUpdateId(ctx)
      const workerIndex = getWorkerForId(id)
      const serializedCtx = serializeContext(ctx)

      // If we couldn't determine worker, use round-robin
      if (workerIndex === null) {
        const availableWorker = workers.find(w => w.load < maxUpdatesPerWorker)
        if (availableWorker) {
          try {
            availableWorker.worker.send({ type: 'UPDATE', payload: serializedCtx })
            availableWorker.load++
            activeTasks.set(serializedCtx.update.update_id, { worker: availableWorker.worker, timeout: timeoutId })
          } catch (err) {
            clearTimeout(timeoutId);
            console.error('Failed to send update to worker:', err)
            queueManager.addToQueue(ctx)
          }
          return
        } else {
          queueManager.addToQueue(ctx)
        }
        return
      }

      // Use designated worker if possible
      const targetWorker = workers[workerIndex]
      if (targetWorker.load < maxUpdatesPerWorker) {
        try {
          targetWorker.worker.send({ type: 'UPDATE', payload: serializedCtx })
          targetWorker.load++
          activeTasks.set(serializedCtx.update.update_id, { worker: targetWorker.worker, timeout: timeoutId })
        } catch (err) {
          clearTimeout(timeoutId);
          console.error('Failed to send update to worker:', err)
          queueManager.addToQueue(ctx)
        }
      } else {
        clearTimeout(timeoutId);
        queueManager.addToQueue(ctx)
      }
    } catch (err) {
      console.error('Error in distributeUpdate:', err)
      queueManager.addToQueue(ctx)
    }
  }

  function processQueue() {
    try {
      // Process queue while we have updates and available workers
      while (queueManager.hasUpdates()) {
        const ctx = queueManager.getNextUpdate(); // Assuming this is the correct method name
        if (!ctx) break;

        const id = getUpdateId(ctx);
        const workerIndex = getWorkerForId(id);

        if (workerIndex !== null) {
          const targetWorker = workers[workerIndex];
          if (targetWorker.load < maxUpdatesPerWorker) {
            const serializedCtx = serializeContext(ctx);
            targetWorker.worker.send({ type: 'UPDATE', payload: serializedCtx });
            targetWorker.load++;

            const timeoutId = setTimeout(() => {
              if (activeTasks.has(ctx.update.update_id)) {
                console.warn(`Task ${ctx.update.update_id} timed out, requeueing...`);
                queueManager.addToQueue(ctx);
                const { timeout } = activeTasks.get(ctx.update.update_id);
                clearTimeout(timeout);
                activeTasks.delete(ctx.update.update_id);
              }
            }, 30000);

            activeTasks.set(ctx.update.update_id, { worker: targetWorker.worker, timeout: timeoutId });
            continue;
          }
        }

        // Fallback to any available worker
        const availableWorker = workers.find(w => w.load < maxUpdatesPerWorker);
        if (availableWorker) {
          const serializedCtx = serializeContext(ctx);
          availableWorker.worker.send({ type: 'UPDATE', payload: serializedCtx });
          availableWorker.load++;

          const timeoutId = setTimeout(() => {
            if (activeTasks.has(ctx.update.update_id)) {
              console.warn(`Task ${ctx.update.update_id} timed out, requeueing...`);
              queueManager.addToQueue(ctx);
              const { timeout } = activeTasks.get(ctx.update.update_id);
              clearTimeout(timeout);
              activeTasks.delete(ctx.update.update_id);
            }
          }, 30000);

          activeTasks.set(ctx.update.update_id, { worker: availableWorker.worker, timeout: timeoutId });
        } else {
          // If no worker is available, put the update back in queue
          queueManager.addToQueue(ctx);
          break;
        }
      }

      if (queueManager.shouldResume()) {
        queueManager.resumeUpdates();
      }
    } catch (err) {
      console.error('Error in processQueue:', err);
    }
  }

  bot.use((ctx, next) => {
    distributeUpdate(ctx)
    return next()
  })

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`)

    // Find unfinished tasks from dead worker
    for (const [updateId, taskData] of activeTasks.entries()) {
      if (taskData.worker === worker) {
        clearTimeout(taskData.timeout);
        const ctx = queueManager.findUpdateById(updateId)
        if (ctx) {
          console.log(`Requeueing unfinished task ${updateId}`)
          queueManager.addToQueue(ctx)
        }
        activeTasks.delete(updateId)
      }
    }

    const newWorker = cluster.fork()
    const index = workers.findIndex(w => w.worker === worker)
    if (index !== -1) {
      workers[index] = { worker: newWorker, load: 0 }
    }
  })

  workers.forEach(({ worker }) => {
    worker.on('message', async (msg) => {
      try {
        if (msg.type === 'TASK_COMPLETED') {
          const workerData = workers.find(w => w.worker === worker)
          if (workerData) {
            workerData.load = Math.max(0, workerData.load - 1) // Prevent negative load
            const taskData = activeTasks.get(msg.updateId);
            if (taskData) {
              clearTimeout(taskData.timeout);
              activeTasks.delete(msg.updateId)
            }
            processQueue()
          }
        } else if (msg.type === 'SEND_MESSAGE') {
          try {
            await bot.telegram.sendMessage(msg.chatId, msg.text)
          } catch (err) {
            console.error('Failed to send message:', err)
            worker.send({ type: 'SEND_MESSAGE_ERROR', error: err.message, messageId: msg.messageId })
          }
        } else if (msg.type === 'TDLIB_REQUEST') {
          try {
            const result = await tdlib[msg.method](...msg.args)
            worker.send({ type: 'TDLIB_RESPONSE', id: msg.id, result })
          } catch (error) {
            worker.send({ type: 'TDLIB_RESPONSE', id: msg.id, error: error.message })
          }
        } else if (msg.type === 'SYNC_LOAD_RESPONSE') {
          const workerData = workers.find(w => w.worker === worker)
          if (workerData) {
            workerData.load = msg.actualLoad
          }
        }
      } catch (err) {
        console.error('Error handling worker message:', err)
      }
    })

    worker.on('error', (err) => {
      console.error(`Worker ${worker.process.pid} error:`, err)
    })
  })

  // Add periodic load synchronization
  setInterval(() => {
    workers.forEach(workerData => {
      workerData.worker.send({
        type: 'SYNC_LOAD_REQUEST'
      })
    })
  }, 60000) // Sync every minute

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

  // Add graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Master received SIGTERM, saving state...')
    // Save active tasks and queue state
    await queueManager.saveState()
    process.exit(0)
  })
}

module.exports = { setupMaster }

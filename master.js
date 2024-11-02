const cluster = require('cluster')
const { stats } = require('./middlewares')

// Constants for priorities
const PRIORITY = {
  HIGH: 0,
  NORMAL: 1,
  LOW: 2
};

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
  const requeueHistory = new Map(); // Track requeue attempts
  const MAX_REQUEUE_ATTEMPTS = 3;
  const INITIAL_TIMEOUT = 30000; // 30 seconds

  const userTasks = new Map(); // Map for grouping user tasks
  const delayedTasks = new Map(); // Map for delayed tasks

  function getBackoffTimeout(attempts) {
    return Math.min(INITIAL_TIMEOUT * Math.pow(2, attempts), 300000); // Max 5 minutes
  }

  function shouldRequeue(updateId) {
    const history = requeueHistory.get(updateId) || { attempts: 0, lastRequeue: 0 };
    if (history.attempts >= MAX_REQUEUE_ATTEMPTS) {
      console.warn(`Task ${updateId} exceeded max requeue attempts, dropping`);
      requeueHistory.delete(updateId);
      return false;
    }
    return true;
  }

  // Add new tracking for timeout logs
  const timeoutLogs = {
    lastBatch: [],
    lastLogTime: Date.now(),
    batchSize: 0
  };

  function logTimeouts() {
    const now = Date.now();
    if (timeoutLogs.batchSize > 0) {
      if (timeoutLogs.batchSize > 10) {
        console.warn(`Multiple tasks timed out (${timeoutLogs.batchSize} total)`);
        console.warn(`Last 5 task IDs: ${timeoutLogs.lastBatch.slice(-5).join(', ')}`);
      } else {
        console.warn(`Tasks timed out: ${timeoutLogs.lastBatch.join(', ')}`);
      }
      timeoutLogs.batchSize = 0;
      timeoutLogs.lastBatch = [];
      timeoutLogs.lastLogTime = now;
    }
  }

  // Update existing handleTaskTimeout function
  function handleTaskTimeout(ctx, updateId) {
    if (activeTasks.has(updateId)) {
      const history = requeueHistory.get(updateId) || { attempts: 0, lastRequeue: 0 };
      const now = Date.now();

      if (shouldRequeue(updateId)) {
        history.attempts++;
        history.lastRequeue = now;
        requeueHistory.set(updateId, history);

        if (history.attempts > 1) {
          // Batch timeout logs
          timeoutLogs.lastBatch.push(updateId);
          timeoutLogs.batchSize++;

          // Log every 5 seconds or when batch gets too large
          if (now - timeoutLogs.lastLogTime > 5000 || timeoutLogs.batchSize >= 50) {
            logTimeouts();
          }
        }

        queueManager.addToQueue(ctx);
      }

      const { timeout } = activeTasks.get(updateId);
      clearTimeout(timeout);
      activeTasks.delete(updateId);
    }
  }

  // Add periodic timeout log flushing
  setInterval(logTimeouts, 5000);

  function getPriority(ctx) {
    // Determine priority based on update type
    if (ctx.message?.text?.startsWith('/')) return PRIORITY.HIGH; // Commands
    if (ctx.message?.reply_to_message) return PRIORITY.HIGH; // Replies
    return PRIORITY.NORMAL;
  }

  function shouldDelay(ctx) {
    const userId = getUpdateId(ctx);
    const userTaskCount = userTasks.get(userId)?.size || 0;
    return userTaskCount > 10; // Delay if user has too many tasks
  }

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
      const updateId = ctx.update.update_id;
      const userId = getUpdateId(ctx);

      // Check if task should be delayed
      if (shouldDelay(ctx)) {
        const delay = 5000 + Math.random() * 5000; // 5-10 seconds delay
        delayedTasks.set(updateId, {
          ctx,
          executeAt: Date.now() + delay
        });
        return;
      }

      // Group tasks by user
      if (!userTasks.has(userId)) {
        userTasks.set(userId, new Set());
      }
      userTasks.get(userId).add(updateId);

      // Set priority
      const priority = getPriority(ctx);

      const history = requeueHistory.get(updateId) || { attempts: 0, lastRequeue: 0 };
      const timeoutDuration = getBackoffTimeout(history.attempts);

      const timeoutId = setTimeout(() => {
        handleTaskTimeout(ctx, updateId);
      }, timeoutDuration);

      if (queueManager.isPaused()) {
        queueManager.addToQueue(ctx, priority);
        return;
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
            queueManager.addToQueue(ctx, priority)
          }
          return
        } else {
          queueManager.addToQueue(ctx, priority)
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
          queueManager.addToQueue(ctx, priority)
        }
      } else {
        clearTimeout(timeoutId);
        queueManager.addToQueue(ctx, priority)
      }
    } catch (err) {
      console.error('Error in distributeUpdate:', err)
      queueManager.addToQueue(ctx, PRIORITY.LOW)
    }
  }

  // Add queue monitoring state
  const queueMonitoring = {
    lastStallLog: 0,
    lastPendingCount: 0,
    stallStartTime: null,
    logInterval: 30000, // Log every 30 seconds
    significantChangeThreshold: 100 // Log if pending tasks change by this amount
  };

  function logQueueStall(pendingCount) {
    const now = Date.now();

    // Initialize stall start time if not set
    if (!queueMonitoring.stallStartTime) {
      queueMonitoring.stallStartTime = now;
    }

    const stallDuration = Math.floor((now - queueMonitoring.stallStartTime) / 1000);
    const countDiff = Math.abs(pendingCount - queueMonitoring.lastPendingCount);

    // Log if:
    // 1. It's been more than logInterval since last log, or
    // 2. Pending count changed significantly
    if (now - queueMonitoring.lastStallLog > queueMonitoring.logInterval ||
        countDiff > queueMonitoring.significantChangeThreshold) {

      console.warn(
        `Queue stalled for ${stallDuration}s: ${pendingCount} pending tasks` +
        (countDiff > 0 ? ` (${countDiff > 0 ? '+' : ''}${countDiff} since last check)` : '')
      );

      queueMonitoring.lastStallLog = now;
      queueMonitoring.lastPendingCount = pendingCount;

      // Log worker status if queue is growing
      if (countDiff > queueMonitoring.significantChangeThreshold) {
        const workerStatus = workers.map(w => ({
          pid: w.worker.process.pid,
          load: w.load
        }));
        console.warn('Worker status:', JSON.stringify(workerStatus));
      }
    }
  }

  // Add monitoring state tracking
  const monitoringState = {
    lastLogTime: Date.now(),
    logInterval: 5000, // Log every 5 seconds
    lastPendingCount: 0,
    lastWorkerLoad: 0,
    significantChangeThreshold: 1000 // Only log if changed by 1000+ tasks
  };

  function shouldLog(pendingCount, totalLoad) {
    const now = Date.now();
    const timePassed = now - monitoringState.lastLogTime;
    const countDiff = Math.abs(pendingCount - monitoringState.lastPendingCount);
    const loadDiff = Math.abs(totalLoad - monitoringState.lastWorkerLoad);

    return timePassed >= monitoringState.logInterval ||
           countDiff >= monitoringState.significantChangeThreshold ||
           loadDiff > maxWorkers;
  }

  function logSystemStatus(pendingCount, totalLoad) {
    const now = Date.now();
    if (!shouldLog(pendingCount, totalLoad)) return;

    const countDiff = pendingCount - monitoringState.lastPendingCount;
    const loadPercent = (totalLoad / (workers.length * maxUpdatesPerWorker) * 100).toFixed(1);

    console.log(
      `Status: ${pendingCount} pending (${countDiff >= 0 ? '+' : ''}${countDiff}), ` +
      `Load: ${totalLoad}/${workers.length * maxUpdatesPerWorker} (${loadPercent}%)`
    );

    monitoringState.lastLogTime = now;
    monitoringState.lastPendingCount = pendingCount;
    monitoringState.lastWorkerLoad = totalLoad;
  }

  // Replace existing queue monitoring
  function processQueue() {
    try {
      // First process delayed tasks
      const now = Date.now();
      for (const [updateId, task] of delayedTasks.entries()) {
        if (task.executeAt <= now) {
          distributeUpdate(task.ctx);
          delayedTasks.delete(updateId);
        }
      }

      // Find available worker with lowest load
      const availableWorker = workers
        .filter(w => w.load < maxUpdatesPerWorker)
        .sort((a, b) => a.load - b.load)[0];

      if (!availableWorker) {
        const pendingCount = Array.from(activeTasks.values()).length;
        const totalLoad = workers.reduce((sum, w) => sum + w.load, 0);
        logSystemStatus(pendingCount, totalLoad);
        return;
      }

      // Reset stall monitoring if we have an available worker
      queueMonitoring.stallStartTime = null;

      // Get next task from queue considering priority
      const ctx = queueManager.getNextUpdate();
      if (!ctx) return;

      const userId = getUpdateId(ctx);
      const serializedCtx = serializeContext(ctx);

      try {
        availableWorker.worker.send({
          type: 'UPDATE',
          payload: serializedCtx,
          priority: getPriority(ctx)
        });
        availableWorker.load++;

        // Set timeout based on priority
        const timeoutDuration = getPriority(ctx) === PRIORITY.HIGH ? 15000 : 30000;
        const timeoutId = setTimeout(() => handleTaskTimeout(ctx, ctx.update.update_id), timeoutDuration);

        activeTasks.set(ctx.update.update_id, {
          worker: availableWorker.worker,
          timeout: timeoutId,
          userId
        });

      } catch (err) {
        console.error('Failed to send to worker:', err);
        queueManager.addToQueue(ctx, PRIORITY.LOW);
      }
    } catch (err) {
      console.error('Error in processQueue:', err);
    }
  }

  // Cleanup user tasks data
  function cleanupUserTasks(userId, updateId) {
    if (userTasks.has(userId)) {
      userTasks.get(userId).delete(updateId);
      if (userTasks.get(userId).size === 0) {
        userTasks.delete(userId);
      }
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
              cleanupUserTasks(taskData.userId, msg.updateId);
              activeTasks.delete(msg.updateId)
            }
            setImmediate(processQueue); // Immediately process the next task
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

  // Update load monitoring interval
  setInterval(() => {
    const totalLoad = workers.reduce((sum, w) => sum + w.load, 0);
    const pendingCount = Array.from(activeTasks.values()).length;

    logSystemStatus(pendingCount, totalLoad);

    // Only log warnings for critical situations
    if (totalLoad === workers.length * maxUpdatesPerWorker &&
        pendingCount > monitoringState.significantChangeThreshold) {
      console.warn('CRITICAL: System severely overloaded');
    }
  }, monitoringState.logInterval);

  // Clean up old requeue history periodically
  setInterval(() => {
    const now = Date.now();
    for (const [updateId, history] of requeueHistory.entries()) {
      if (now - history.lastRequeue > 300000) { // 5 minutes
        requeueHistory.delete(updateId);
      }
    }
  }, 60000);

  // Periodic cleanup of delayed tasks
  setInterval(() => {
    const now = Date.now();
    const maxDelay = 30000; // 30 seconds max delay

    for (const [updateId, task] of delayedTasks.entries()) {
      if (now - task.executeAt > maxDelay) {
        delayedTasks.delete(updateId);
      }
    }
  }, 10000);

  // Add graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Master received SIGTERM, saving state...')
    // Save active tasks and queue state
    await queueManager.saveState()
    process.exit(0)
  })
}

module.exports = { setupMaster }

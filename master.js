const cluster = require('cluster')
const { stats } = require('./middlewares')

// System configuration constants
const CONFIG = {
  UPDATES: {
    MAX_PER_WORKER: 100,
    MAX_USER_TASKS_BEFORE_DELAY: 10,
    TASK_DELAY_MIN: 5000,    // 5 seconds
    TASK_DELAY_MAX: 10000,   // 10 seconds
    HIGH_PRIORITY_TIMEOUT: 15000,
    NORMAL_PRIORITY_TIMEOUT: 30000
  },
  QUEUE: {
    MAX_REQUEUE_ATTEMPTS: 2,
    INITIAL_TIMEOUT: 5000,
    MAX_TIMEOUT: 300000      // 5 minutes
  },
  MONITORING: {
    LOG_INTERVAL: 5000,      // 5 seconds
    STALL_LOG_INTERVAL: 30000,
    SIGNIFICANT_CHANGE: 1000,
    LOAD_SYNC_INTERVAL: 60000,
    CLEANUP_INTERVAL: 10000
  }
};

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

function setupMaster(bot, queueManager, maxWorkers) {
  const tdlib = require('./helpers/tdlib')

  console.log(`Master process ${process.pid} is running`)
  stats.startPeriodicUpdate()

  const workers = []
  const activeTasks = new Map() // Track tasks being processed
  const requeueHistory = new Map(); // Track requeue attempts
  const MAX_REQUEUE_ATTEMPTS = 2;
  const INITIAL_TIMEOUT = 5000; // 5 seconds

  const userTasks = new Map(); // Map for grouping user tasks
  const delayedTasks = new Map(); // Map for delayed tasks

  function getBackoffTimeout(attempts) {
    return Math.min(INITIAL_TIMEOUT * Math.pow(2, attempts), 300000); // Max 5 minutes
  }

  function shouldRequeue(updateId) {
    const history = requeueHistory.get(updateId) || { attempts: 0, lastRequeue: 0 };
    if (history.attempts >= MAX_REQUEUE_ATTEMPTS) {
      requeueHistory.delete(updateId);
      return false;
    }
    return true;
  }

  // Update monitoring state
  const monitoringState = {
    lastLogTime: Date.now(),
    logInterval: 5000, // Log every 5 seconds
    lastPendingCount: 0,
    lastWorkerLoad: 0,
    significantChangeThreshold: 1000, // Only log if changed by 1000+ tasks
    droppedTasks: 0,  // Add counter for dropped tasks
    lastDropReport: Date.now()
  };

  function logSystemStatus(pendingCount, totalLoad) {
    const now = Date.now();
    if (now - monitoringState.lastLogTime < monitoringState.logInterval) return;

    const loadPercent = (totalLoad / (workers.length * CONFIG.UPDATES.MAX_PER_WORKER) * 100).toFixed(1);
    const countDiff = pendingCount - monitoringState.lastPendingCount;

    // Report dropped tasks along with regular status
    if (monitoringState.droppedTasks > 0) {
      console.log(
        `Status: ${pendingCount} pending (${countDiff >= 0 ? '+' : ''}${countDiff}), ` +
        `Load: ${totalLoad}/${workers.length * CONFIG.UPDATES.MAX_PER_WORKER} (${loadPercent}%), ` +
        `Dropped: ${monitoringState.droppedTasks} tasks`
      );
      monitoringState.droppedTasks = 0; // Reset counter
    } else {
      console.log(
        `Status: ${pendingCount} pending (${countDiff >= 0 ? '+' : ''}${countDiff}), ` +
        `Load: ${totalLoad}/${workers.length * CONFIG.UPDATES.MAX_PER_WORKER} (${loadPercent}%)`
      );
    }

    monitoringState.lastLogTime = now;
    monitoringState.lastPendingCount = pendingCount;
    monitoringState.lastWorkerLoad = totalLoad;

    // Only log critical warnings when severely overloaded
    if (totalLoad === workers.length * CONFIG.UPDATES.MAX_PER_WORKER && pendingCount > 1000) {
      console.warn('CRITICAL: System severely overloaded');
    }
  }

  // Remove or modify other logging functions
  function handleTaskTimeout(ctx, updateId) {
    if (activeTasks.has(updateId)) {
      const history = requeueHistory.get(updateId) || { attempts: 0, lastRequeue: 0 };
      const now = Date.now();

      if (shouldRequeue(updateId)) {
        history.attempts++;
        history.lastRequeue = now;
        requeueHistory.set(updateId, history);
        queueManager.addToQueue(ctx);
      } else {
        monitoringState.droppedTasks++; // Increment dropped tasks counter
      }

      const { timeout } = activeTasks.get(updateId);
      clearTimeout(timeout);
      activeTasks.delete(updateId);
    }
  }

  function getPriority(ctx) {
    // Determine priority based on update type
    if (ctx.message?.text?.startsWith('/')) return PRIORITY.HIGH; // Commands
    if (ctx.message?.reply_to_message) return PRIORITY.HIGH; // Replies
    return PRIORITY.NORMAL;
  }

  function shouldDelay(ctx) {
    const userId = getUpdateId(ctx);
    const userTaskCount = userTasks.get(userId)?.size || 0;
    return userTaskCount > CONFIG.UPDATES.MAX_USER_TASKS_BEFORE_DELAY;
  }

  for (let i = 0; i < maxWorkers; i++) {
    const worker = cluster.fork()
    workers.push({ worker, load: 0 })
  }

  function getWorkerForId(id) {
    if (!id) return null;
    // Ensure positive number and consistent distribution
    return Math.abs(id) % maxWorkers;
  }

  function distributeUpdate(ctx) {
    try {
      const updateId = ctx.update.update_id;
      const userId = getUpdateId(ctx);

      // Check if task should be delayed
      if (shouldDelay(ctx)) {
        const delay = CONFIG.UPDATES.TASK_DELAY_MIN +
                     Math.random() * (CONFIG.UPDATES.TASK_DELAY_MAX - CONFIG.UPDATES.TASK_DELAY_MIN);
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

      const workerIndex = getWorkerForId(userId);
      const serializedCtx = serializeContext(ctx);

      // Always try to use the designated worker first
      if (workerIndex !== null) {
        const targetWorker = workers[workerIndex];
        if (targetWorker.load < CONFIG.UPDATES.MAX_PER_WORKER) {
          try {
            targetWorker.worker.send({ type: 'UPDATE', payload: serializedCtx });
            targetWorker.load++;
            activeTasks.set(serializedCtx.update.update_id, {
              worker: targetWorker.worker,
              timeout: timeoutId,
              userId
            });
            return;
          } catch (err) {
            clearTimeout(timeoutId);
            console.error('Failed to send update to designated worker:', err);
            // Fall through to queue
          }
        }
      }

      // If designated worker is busy or error occurred, add to queue
      queueManager.addToQueue(ctx, priority);

    } catch (err) {
      console.error('Error in distributeUpdate:', err);
      queueManager.addToQueue(ctx, PRIORITY.LOW);
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
        .filter(w => w.load < CONFIG.UPDATES.MAX_PER_WORKER)
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
      const workerIndex = getWorkerForId(userId);

      // Try designated worker first
      if (workerIndex !== null) {
        const targetWorker = workers[workerIndex];
        if (targetWorker.load < CONFIG.UPDATES.MAX_PER_WORKER) {
          processUpdateWithWorker(ctx, targetWorker);
          return;
        }
      }

      // If designated worker is busy, wait for next cycle
      queueManager.addToQueue(ctx, getPriority(ctx));

    } catch (err) {
      console.error('Error in processQueue:', err);
    }
  }

  // Helper function to process update with specific worker
  function processUpdateWithWorker(ctx, workerData) {
    const serializedCtx = serializeContext(ctx);
    const userId = getUpdateId(ctx);

    try {
      workerData.worker.send({
        type: 'UPDATE',
        payload: serializedCtx,
        priority: getPriority(ctx)
      });
      workerData.load++;

      const timeoutDuration = getPriority(ctx) === PRIORITY.HIGH
        ? CONFIG.UPDATES.HIGH_PRIORITY_TIMEOUT
        : CONFIG.UPDATES.NORMAL_PRIORITY_TIMEOUT;
      const timeoutId = setTimeout(() => handleTaskTimeout(ctx, ctx.update.update_id), timeoutDuration);

      activeTasks.set(ctx.update.update_id, {
        worker: workerData.worker,
        timeout: timeoutId,
        userId
      });
    } catch (err) {
      console.error('Failed to send to worker:', err);
      queueManager.addToQueue(ctx, PRIORITY.LOW);
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
  }, CONFIG.MONITORING.LOAD_SYNC_INTERVAL) // Sync every minute

  // Update load monitoring interval
  setInterval(() => {
    const totalLoad = workers.reduce((sum, w) => sum + w.load, 0);
    const pendingCount = Array.from(activeTasks.values()).length;

    logSystemStatus(pendingCount, totalLoad);

    // Only log warnings for critical situations
    if (totalLoad === workers.length * CONFIG.UPDATES.MAX_PER_WORKER &&
        pendingCount > monitoringState.significantChangeThreshold) {
      console.warn('CRITICAL: System severely overloaded');
    }
  }, CONFIG.MONITORING.LOG_INTERVAL);

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

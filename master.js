const cluster = require('cluster')
const { stats } = require('./middlewares')
const os = require('os')

// Helper function for timestamped logging
const logWithTimestamp = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

const errorWithTimestamp = (message, ...args) => {
  console.error(`[${new Date().toISOString()}] ${message}`, ...args)
}

const warnWithTimestamp = (message) => {
  console.warn(`[${new Date().toISOString()}] ${message}`)
}

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
const WORKER_HEALTH_CHECK_INTERVAL = 10000
const ADAPTIVE_SCALING_INTERVAL = 30000
const MIN_WORKERS = 2
const CPU_THRESHOLD = 80 // percentage

function setupMaster (bot, queueManager, maxWorkers, maxUpdatesPerWorker) {
  const tdlib = require('./helpers/tdlib')
  const healthEndpoint = require('./health-endpoint')

  // Start health check endpoint
  healthEndpoint.createHealthServer()

  // Circuit breaker for TDLib operations
  const circuitBreaker = {
    failures: 0,
    lastFailTime: 0,
    isOpen: false,
    successCount: 0,

    async execute(operation, operationName = 'unknown') {
      // Check if circuit is open
      if (this.isOpen) {
        const timeSinceLastFail = Date.now() - this.lastFailTime
        if (timeSinceLastFail < 30000) { // 30 seconds cooldown
          throw new Error(`Circuit breaker is open for TDLib operations (${operationName})`)
        } else {
          // Half-open state: try one request
          this.isOpen = false
        }
      }

      try {
        const result = await operation()

        // Success - reset failure count
        this.failures = 0
        this.successCount++

        // If we had multiple successes after being open, fully close the circuit
        if (this.successCount >= 3) {
          this.isOpen = false
          this.successCount = 0
        }

        return result
      } catch (error) {
        this.failures++
        this.lastFailTime = Date.now()
        this.successCount = 0

        // Open circuit after 3 consecutive failures
        if (this.failures >= 3) {
          this.isOpen = true
          errorWithTimestamp(`Circuit breaker opened for TDLib after ${this.failures} failures`)
        }

        throw error
      }
    }
  }

  // TDLib health monitoring
  let tdlibHealthy = true
  let lastTdlibCheck = Date.now()
  const TDLIB_HEALTH_INTERVAL = 30000 // 30 seconds

  const checkTdlibHealth = async () => {
    try {
      // Simple health check using getMe
      const result = await Promise.race([
        tdlib.getUser(process.env.BOT_TOKEN.split(':')[0]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
      ])

      // Check if result is an error object
      if (result && result.code && result.message) {
        throw new Error(result.message)
      }

      if (!tdlibHealthy) {
        logWithTimestamp('TDLib health restored')
        tdlibHealthy = true
      }
    } catch (error) {
      if (tdlibHealthy) {
        errorWithTimestamp('TDLib health check failed:', error.message)
        tdlibHealthy = false
      }

      // If health check fails, try to trigger TDLib reconnection
      if (error.message.includes('not available') || error.message.includes('timeout')) {
        logWithTimestamp('Attempting to trigger TDLib reconnection...')
        // The tdlib module will handle reconnection internally
      }
    }
    lastTdlibCheck = Date.now()
  }

  // Start health checks
  const tdlibHealthInterval = setInterval(checkTdlibHealth, TDLIB_HEALTH_INTERVAL)
  checkTdlibHealth() // Initial check

  // Add request tracking
  let requestCounts = []
  const RPS_WINDOW = 10 // Window size in seconds

  function trackRequest() {
    const now = Date.now()
    requestCounts.push(now)
    // Keep only requests within the window
    requestCounts = requestCounts.filter(time => now - time < RPS_WINDOW * 1000)
  }

  function calculateRPS() {
    const now = Date.now()
    // Clean old requests first
    requestCounts = requestCounts.filter(time => now - time < RPS_WINDOW * 1000)
    return (requestCounts.length / RPS_WINDOW).toFixed(2)
  }

  logWithTimestamp(`Master process ${process.pid} is running`)

  stats.startPeriodicUpdate()

  const workers = []

  for (let i = 0; i < maxWorkers; i++) {
    const worker = cluster.fork()
    workers.push({ worker, load: 0, health: 100 })
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
    const identifier = getUpdateIdentifier(update)
    const targetWorker = getWorkerForId(identifier)
    const priority = getUpdatePriority(update)

    const updateItem = {
      update,
      workerIndex: workers.indexOf(targetWorker),
      priority
    }

    if (!queueManager.isPaused() && targetWorker.load < maxUpdatesPerWorker) {
      targetWorker.worker.send({ type: MESSAGE_TYPES.UPDATE, payload: update })
      targetWorker.load++
    } else {
      queueManager.addToQueue(updateItem)
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
    trackRequest() // Track each request

    // Update health check activity
    healthEndpoint.updateActivity()

    distributeUpdate(update)
    return next()
  })

  cluster.on('exit', (worker, code, signal) => {
    logWithTimestamp(`Worker ${worker.process.pid} died`)
    const newWorker = cluster.fork()
    workers.splice(workers.findIndex(w => w.worker === worker), 1, { worker: newWorker, load: 0, health: 100 })
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
        // Check TDLib health before processing
        const timeSinceLastCheck = Date.now() - lastTdlibCheck
        if (!tdlibHealthy || timeSinceLastCheck > TDLIB_HEALTH_INTERVAL * 2) {
          worker.send({
            type: MESSAGE_TYPES.TDLIB_RESPONSE,
            id: msg.id,
            error: timeSinceLastCheck > TDLIB_HEALTH_INTERVAL * 2
              ? 'TDLib health check overdue'
              : 'TDLib is currently unhealthy'
          })
          return
        }

        // Add timeout for TDLib operations
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`TDLib ${msg.method} timeout in master`)), 8000) // Reduced to 8s
        })

        try {
          const result = await circuitBreaker.execute(async () => {
            return await Promise.race([
              tdlib[msg.method](...msg.args),
              timeoutPromise
            ])
          }, msg.method)

          worker.send({ type: MESSAGE_TYPES.TDLIB_RESPONSE, id: msg.id, result })
        } catch (error) {
          errorWithTimestamp(`TDLib ${msg.method} error:`, error.message)

          // Mark as unhealthy if consistent failures or circuit breaker is open
          if (error.message.includes('timeout') || error.message.includes('Circuit breaker is open')) {
            tdlibHealthy = false
          }

          worker.send({ type: MESSAGE_TYPES.TDLIB_RESPONSE, id: msg.id, error: error.message })
        }
      }
    })
  })

  // Load monitoring
  const loadMonitorInterval = setInterval(() => {
    const totalLoad = workers.reduce((sum, w) => sum + w.load, 0)
    const queueStatus = queueManager.getStatus()
    logWithTimestamp(`Total worker load: ${totalLoad}, ${queueStatus}`)

    if (totalLoad === workers.length * maxUpdatesPerWorker && queueManager.hasUpdates()) {
      warnWithTimestamp('System under high load: All workers at max capacity and queue not empty')
      // Add logic here for notifying admin or auto-scaling
    }
  }, LOAD_CHECK_INTERVAL)

  // Adaptive scaling
  let optimalWorkerCount = maxWorkers

  function adjustWorkersCount() {
    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length
    const currentQueueLoad = queueManager.updateQueue.size / queueManager.maxQueueSize * 100

    if (cpuUsage > CPU_THRESHOLD || currentQueueLoad > 70) {
      optimalWorkerCount = Math.min(maxWorkers, workers.length + 1)
    } else if (cpuUsage < CPU_THRESHOLD / 2 && currentQueueLoad < 30) {
      optimalWorkerCount = Math.max(MIN_WORKERS, workers.length - 1)
    }

    adjustWorkerPool()
  }

  function adjustWorkerPool() {
    while (workers.length < optimalWorkerCount) {
      const worker = cluster.fork()
      workers.push({ worker, load: 0, health: 100 })
    }

    while (workers.length > optimalWorkerCount) {
      const leastHealthyWorker = workers
        .sort((a, b) => a.health - b.health)[0]
      leastHealthyWorker.worker.kill()
    }
  }

  // Add these functions before the checkWorkersHealth function

  function measureWorkerResponseTime(worker) {
    return new Promise((resolve) => {
      const start = Date.now()
      const timeoutId = setTimeout(() => resolve(5000), 5000) // Max response time 5s

      worker.once('message', () => {
        clearTimeout(timeoutId)
        resolve(Date.now() - start)
      })

      worker.send({ type: 'HEALTH_CHECK' })
    })
  }

  function calculateWorkerHealth(responseTime, load) {
    // Health score from 0 to 100
    // Response time weight: 60%, Load weight: 40%
    const responseScore = Math.max(0, 100 - (responseTime / 50)) // Penalize for response times over 50ms
    const loadScore = Math.max(0, 100 - (load * 10)) // Penalize for high load

    return Math.round((responseScore * 0.6) + (loadScore * 0.4))
  }

  // Modify checkWorkersHealth to be async
  async function checkWorkersHealth() {
    for (const workerData of workers) {
      const responseTime = await measureWorkerResponseTime(workerData.worker)
      workerData.health = calculateWorkerHealth(responseTime, workerData.load)
    }
  }

  // Periodic checks
  const healthCheckInterval = setInterval(checkWorkersHealth, WORKER_HEALTH_CHECK_INTERVAL)
  const scalingInterval = setInterval(adjustWorkersCount, ADAPTIVE_SCALING_INTERVAL)

  // Enhanced error handling
  process.on('uncaughtException', (error) => {
    errorWithTimestamp('Uncaught Exception:', error)
    // Cleanup intervals
    clearInterval(tdlibHealthInterval)
    clearInterval(healthCheckInterval)
    clearInterval(scalingInterval)
    clearInterval(loadMonitorInterval)
    clearInterval(metricsInterval)
    // Recovery attempt
    workers.forEach(({ worker }) => worker.kill())
    process.exit(1)
  })

  // Cleanup on process termination
  process.on('SIGTERM', () => {
    clearInterval(tdlibHealthInterval)
    clearInterval(healthCheckInterval)
    clearInterval(scalingInterval)
    clearInterval(loadMonitorInterval)
    clearInterval(metricsInterval)
  })

  process.on('SIGINT', () => {
    clearInterval(tdlibHealthInterval)
    clearInterval(healthCheckInterval)
    clearInterval(scalingInterval)
    clearInterval(loadMonitorInterval)
    clearInterval(metricsInterval)
  })

  const metricsInterval = setInterval(() => {
    const metrics = queueManager.getMetrics()
    const workerMetrics = workers.map(w => ({
      pid: w.worker.process.pid,
      load: w.load,
      health: w.health
    }))

    const memoryUsage = process.memoryUsage()

    const timestamp = new Date().toISOString()
    console.log(`\n[${timestamp}] === System Metrics ===`)
    console.log('Performance:')
    console.log(`  Requests/sec: ${calculateRPS()}`) // Add RPS to metrics

    console.log('\nQueue Status:')
    const queueMetrics = metrics
    const hasNonZeroValues = Object.values(queueMetrics).some(value =>
      value !== 0 && value !== false && !(Array.isArray(value) && value.length === 0)
    )

    if (!hasNonZeroValues) {
      console.log('  Empty queue')
    } else {
      const metricsToShow = {
        'Total Processed': queueMetrics.totalProcessed,
        'Errors': queueMetrics.errors,
        'Average Processing Time': queueMetrics.avgProcessingTime ? `${queueMetrics.avgProcessingTime.toFixed(2)}ms` : '0ms',
        'Current Size': queueMetrics.currentSize,
        'Status': queueMetrics.isPaused ? 'Paused' : 'Active',
        'Cache Items': queueMetrics.cacheSize
      }

      Object.entries(metricsToShow).forEach(([key, value]) => {
        if (value && value !== '0ms' && value !== 0) {
          console.log(`  ${key}: ${value}`)
        }
      })
    }

    console.log('\nWorkers Status:')
    workerMetrics.forEach(worker => {
      console.log(`  Worker PID ${worker.pid}:`)

      console.log(`    Load: ${worker.load}`)
      console.log(`    Health: ${worker.health}%`)
    })

    console.log('\nSystem Status:')
    console.log(`  CPU Load: ${(os.loadavg()[0]).toFixed(2)}`)
    console.log(`  Memory:`)
    console.log(`    RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`)
    console.log(`    Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`)
    console.log(`    Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  TDLib Status:`)
    console.log(`    Healthy: ${tdlibHealthy ? 'Yes' : 'No'}`)
    console.log(`    Last Check: ${Math.round((Date.now() - lastTdlibCheck) / 1000)}s ago`)
    console.log(`    Circuit Breaker: ${circuitBreaker.isOpen ? 'Open' : 'Closed'} (failures: ${circuitBreaker.failures})`)
    console.log(`  Uptime: ${(process.uptime() / 60).toFixed(2)} minutes`)
    console.log('==================\n')
  }, LOAD_CHECK_INTERVAL)
}

module.exports = { setupMaster }

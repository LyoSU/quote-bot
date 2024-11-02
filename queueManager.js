const FastPriorityQueue = require('fastpriorityqueue')
const EventEmitter = require('events')

// Default values and thresholds
const DEFAULT_MAX_QUEUE_SIZE = 1000
const DEFAULT_WARNING_THRESHOLD = 0.6 // 60%
const DEFAULT_PAUSE_THRESHOLD = 0.8 // 80%
const DEFAULT_RESUME_THRESHOLD = 0.5 // 50%
const DEFAULT_PAUSE_DURATION = 5000 // in milliseconds
const STATUS_LOG_INTERVAL = 5000 // in milliseconds
const WARNING_LOG_INTERVAL = 60000 // in milliseconds

class QueueManager extends EventEmitter {
  constructor (
    maxQueueSize = DEFAULT_MAX_QUEUE_SIZE,
    warningThreshold = DEFAULT_WARNING_THRESHOLD,
    pauseThreshold = DEFAULT_PAUSE_THRESHOLD,
    resumeThreshold = DEFAULT_RESUME_THRESHOLD,
    pauseDuration = DEFAULT_PAUSE_DURATION
  ) {
    super()
    this.maxQueueSize = maxQueueSize
    this.warningThreshold = warningThreshold
    this.pauseThreshold = pauseThreshold
    this.resumeThreshold = resumeThreshold
    this.pauseDuration = pauseDuration
    this.updateQueue = new FastPriorityQueue((a, b) => a.priority > b.priority)
    this.lastWarningTime = 0
    this.isPausedFlag = false
    this.pauseTimeout = null
    this.lastStatusChangeTime = 0

    // Metrics
    this.metrics = {
      totalProcessed: 0,
      errors: 0,
      avgProcessingTime: 0,
      lastProcessingTimes: []
    }

    // Cache of recently processed items
    this.processedCache = new Map()
    this.MAX_CACHE_SIZE = 1000
  }

  addToQueue (item) {
    try {
      // Check duplicates
      const itemId = this.getItemId(item)
      if (this.processedCache.has(itemId)) {
        return false
      }

      if (this.updateQueue.size < this.maxQueueSize) {
        this.updateQueue.add(item)

        const queuePercentage = this.updateQueue.size / this.maxQueueSize

        if (queuePercentage >= this.pauseThreshold) {
          this.pauseUpdates()
        } else if (queuePercentage >= this.warningThreshold) {
          this.logWarning()
        }
      } else {
        // Remove oldest item to make space
        this.updateQueue.poll()
        this.updateQueue.add(item)
        this.logWarning()
      }

      this.emit('itemAdded', item)
      return true
    } catch (error) {
      this.metrics.errors++
      this.emit('error', error)
      throw error
    }
  }

  getItemId(item) {
    return `${item.update?.message?.chat?.id}_${item.update?.message?.message_id}`
  }

  async processItem(item) {
    const startTime = process.hrtime()

    try {
      const result = await this.getNextUpdate()

      // Save to cache
      const itemId = this.getItemId(item)
      this.processedCache.set(itemId, Date.now())

      // Clean old cache entries
      if (this.processedCache.size > this.MAX_CACHE_SIZE) {
        const oldestKey = this.processedCache.keys().next().value
        this.processedCache.delete(oldestKey)
      }

      // Update metrics
      this.updateMetrics(process.hrtime(startTime))

      return result
    } catch (error) {
      this.metrics.errors++
      this.emit('error', error)
      throw error
    }
  }

  updateMetrics(processingTime) {
    this.metrics.totalProcessed++

    const timeMs = processingTime[0] * 1000 + processingTime[1] / 1e6
    this.metrics.lastProcessingTimes.push(timeMs)

    if (this.metrics.lastProcessingTimes.length > 100) {
      this.metrics.lastProcessingTimes.shift()
    }

    this.metrics.avgProcessingTime =
      this.metrics.lastProcessingTimes.reduce((a, b) => a + b, 0) /
      this.metrics.lastProcessingTimes.length
  }

  getMetrics() {
    return {
      ...this.metrics,
      currentSize: this.updateQueue.size,
      isPaused: this.isPausedFlag,
      cacheSize: this.processedCache.size
    }
  }

  getNextUpdate () {
    return this.updateQueue.poll()
  }

  hasUpdates () {

    return !this.updateQueue.isEmpty()
  }

  pauseUpdates () {
    if (!this.isPausedFlag) {
      this.isPausedFlag = true
      this.logStatusChange('Pause updates')

      this.pauseTimeout = setTimeout(() => {
        this.resumeUpdates()
      }, this.pauseDuration)
    }
  }

  resumeUpdates () {
    if (this.isPausedFlag) {
      this.isPausedFlag = false
      if (this.pauseTimeout) {
        clearTimeout(this.pauseTimeout)
        this.pauseTimeout = null
      }
      this.logStatusChange('Resume updates')
    }
  }

  logWarning () {
    const currentTime = Date.now()
    if (currentTime - this.lastWarningTime > WARNING_LOG_INTERVAL) {
      console.warn(`Queue size: ${this.updateQueue.size} (${(this.updateQueue.size / this.maxQueueSize * 100).toFixed(2)}%)`)
      this.lastWarningTime = currentTime
    }
  }

  logStatusChange (message) {
    const currentTime = Date.now()
    if (currentTime - this.lastStatusChangeTime > STATUS_LOG_INTERVAL) {
      console.log(message)
      this.lastStatusChangeTime = currentTime
    }
  }

  shouldResume () {
    return this.isPausedFlag && (this.updateQueue.size / this.maxQueueSize) <= this.resumeThreshold
  }

  isPaused () {
    return this.isPausedFlag
  }

  getStatus () {
    const queuePercentage = (this.updateQueue.size / this.maxQueueSize) * 100
    return `Queue size: ${this.updateQueue.size} (${queuePercentage.toFixed(2)}%)`
  }
}

module.exports = { QueueManager }

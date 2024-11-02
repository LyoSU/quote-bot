// Default values and thresholds
const DEFAULT_MAX_QUEUE_SIZE = 1000
const DEFAULT_WARNING_THRESHOLD = 0.6 // 60%
const DEFAULT_PAUSE_THRESHOLD = 0.8 // 80%
const DEFAULT_RESUME_THRESHOLD = 0.5 // 50%
const DEFAULT_PAUSE_DURATION = 5000 // in milliseconds
const STATUS_LOG_INTERVAL = 5000 // in milliseconds
const WARNING_LOG_INTERVAL = 60000 // in milliseconds

class QueueManager {
  constructor (
    maxQueueSize = DEFAULT_MAX_QUEUE_SIZE,
    warningThreshold = DEFAULT_WARNING_THRESHOLD,
    pauseThreshold = DEFAULT_PAUSE_THRESHOLD,
    resumeThreshold = DEFAULT_RESUME_THRESHOLD,
    pauseDuration = DEFAULT_PAUSE_DURATION
  ) {
    this.maxQueueSize = maxQueueSize
    this.warningThreshold = warningThreshold
    this.pauseThreshold = pauseThreshold
    this.resumeThreshold = resumeThreshold
    this.pauseDuration = pauseDuration
    this.updateQueue = []
    this.lastWarningTime = 0
    this.isPausedFlag = false
    this.pauseTimeout = null
    this.lastStatusChangeTime = 0
  }

  addToQueue (item) {
    if (this.updateQueue.length < this.maxQueueSize) {
      this.insertWithPriority(item)

      const queuePercentage = this.updateQueue.length / this.maxQueueSize

      if (queuePercentage >= this.pauseThreshold) {
        this.pauseUpdates()
      } else if (queuePercentage >= this.warningThreshold) {
        this.logWarning()
      }
    } else {
      // Remove oldest item to make space
      this.updateQueue.shift()
      this.insertWithPriority(item)
      this.logWarning()
    }
  }

  // Insert item into queue based on priority
  insertWithPriority (item) {
    const index = this.updateQueue.findIndex(queueItem => item.priority > queueItem.priority)
    if (index === -1) {
      // Lower priority, add to the end
      this.updateQueue.push(item)
    } else {
      // Insert at the correct position
      this.updateQueue.splice(index, 0, item)
    }
  }

  getNextUpdate () {
    return this.updateQueue.shift()
  }

  hasUpdates () {
    return this.updateQueue.length > 0
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
      console.warn(`Queue size: ${this.updateQueue.length} (${(this.updateQueue.length / this.maxQueueSize * 100).toFixed(2)}%)`)
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
    return this.isPausedFlag && (this.updateQueue.length / this.maxQueueSize) <= this.resumeThreshold
  }

  isPaused () {
    return this.isPausedFlag
  }

  getStatus () {
    const queuePercentage = (this.updateQueue.length / this.maxQueueSize) * 100
    return `Queue size: ${this.updateQueue.length} (${queuePercentage.toFixed(2)}%)`
  }
}

module.exports = { QueueManager }

class QueueManager {
  constructor (maxQueueSize, warningThreshold, pauseThreshold, resumeThreshold, pauseDuration) {
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

  addToQueue (update) {
    if (this.updateQueue.length < this.maxQueueSize) {
      this.updateQueue.push(update)

      const queuePercentage = this.updateQueue.length / this.maxQueueSize

      if (queuePercentage >= this.pauseThreshold) {
        this.pauseUpdates()
      } else if (queuePercentage >= this.warningThreshold) {
        this.logWarning()
      }
    } else {
      this.updateQueue.shift()
      this.updateQueue.push(update)
      this.logWarning()
    }
  }

  logWarning () {
    const currentTime = Date.now()
    if (currentTime - this.lastWarningTime > 60000) {
      console.warn(`Queue size: ${this.updateQueue.length} (${(this.updateQueue.length / this.maxQueueSize * 100).toFixed(2)}%)`)
      this.lastWarningTime = currentTime
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

  logStatusChange (message) {
    const currentTime = Date.now()
    if (currentTime - this.lastStatusChangeTime > 5000) {
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

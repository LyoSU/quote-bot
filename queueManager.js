class QueueManager {
  constructor (bot, maxQueueSize, warningThreshold, pauseThreshold, resumeThreshold, pauseDuration) {
    this.bot = bot
    this.maxQueueSize = maxQueueSize
    this.warningThreshold = warningThreshold
    this.pauseThreshold = pauseThreshold
    this.resumeThreshold = resumeThreshold
    this.pauseDuration = pauseDuration
    this.updateQueue = []
    this.lastWarningTime = 0
    this.isPausedFlag = false
    this.pauseTimeout = null
  }

  addToQueue (update) {
    if (this.updateQueue.length < this.maxQueueSize) {
      this.updateQueue.push(update)

      const queuePercentage = this.updateQueue.length / this.maxQueueSize

      if (queuePercentage >= this.pauseThreshold) {
        this.pauseUpdates()
      } else if (queuePercentage >= this.warningThreshold) {
        const currentTime = Date.now()
        if (currentTime - this.lastWarningTime > 60000) {
          console.warn(`Queue size warning: ${this.updateQueue.length} updates queued (${(queuePercentage * 100).toFixed(2)}%)`)
          this.lastWarningTime = currentTime
        }
      }
    } else {
      this.updateQueue.shift()
      this.updateQueue.push(update)

      const currentTime = Date.now()
      if (currentTime - this.lastWarningTime > 60000) {
        console.warn(`Queue full, oldest update replaced. Current size: ${this.updateQueue.length}`)
        this.lastWarningTime = currentTime
      }
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
      console.log('Pause updates')

      if (this.bot && typeof this.bot.stop === 'function') {
        this.bot.stop()
          .then(() => console.log('Bot stopped'))
          .catch(error => console.error('Error stopping bot:', error))
      } else {
        console.warn('Bot instance is not available or stop method is not available')
      }

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
      console.log('Resume updates')
      if (this.bot && typeof this.bot.launch === 'function') {
        this.bot.launch()
          .then(() => console.log('Bot launched'))
          .catch(error => console.error('Error launching bot:', error))
      } else {
        console.warn('Bot instance is not available or launch method is not available')
      }
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
    return `Розмір черги: ${this.updateQueue.length} (${queuePercentage.toFixed(2)}%)`
  }
}

module.exports = { QueueManager }

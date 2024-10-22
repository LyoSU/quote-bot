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
      console.log('Pausing update receiving due to high load.')

      if (this.bot && typeof this.bot.stop === 'function') {
        this.bot.stop('pause')
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
      console.log('Resuming update receiving.')
      if (this.bot && typeof this.bot.launch === 'function') {
        this.bot.launch({
          polling: {
            allowedUpdates: [
              'message',
              'edited_message',
              'channel_post',
              'edited_channel_post',
              'inline_query',
              'chosen_inline_result',
              'callback_query',
              'shipping_query',
              'pre_checkout_query',
              'poll',
              'poll_answer',
              'my_chat_member',
              'chat_member',
              'chat_join_request',
              'business_message'
            ]
          }
        }).then(() => {
          console.log('Bot resumed polling')
        }).catch((error) => {
          console.error('Error resuming bot:', error)
        })
      } else {
        console.warn('Bot instance is not available or does not have a launch method')
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
    return `Queue size: ${this.updateQueue.length} (${queuePercentage.toFixed(2)}%)`
  }
}

module.exports = { QueueManager }

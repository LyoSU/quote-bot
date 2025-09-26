const got = require('got')

/**
 * Send ad to user via Gramads API
 * @param {number} chatId - Telegram chat ID
 * @returns {Promise<object|null>} - API response or null if failed
 */
const sendGramadsAd = async (chatId) => {
  try {
    const token = process.env.GRAMADS_TOKEN

    if (!token) {
      console.error('GRAMADS_TOKEN not found in environment variables')
      return null
    }

    const sendPostDto = { SendToChatId: chatId }

    const response = await got.post('https://api.gramads.net/ad/SendPost', {
      json: sendPostDto,
      headers: {
        Authorization: `bearer ${token}`
      },
      timeout: {
        request: 10000 // 10 second timeout
      }
    })

    if (response.statusCode === 200) {
      // Removed success log to reduce spam
      return JSON.parse(response.body)
    } else {
      console.warn(`Gramads API returned status ${response.statusCode} for chat ${chatId}`)
      return null
    }
  } catch (error) {
    // Don't log full error to avoid spam, just the essential info
    console.error(`Failed to send Gramads ad to chat ${chatId}: ${error.message}`)
    return null
  }
}

module.exports = {
  sendGramadsAd
}

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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch('https://api.gramads.net/ad/SendPost', {
      method: 'POST',
      body: JSON.stringify(sendPostDto),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${token}`
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return await response.json()
    } else {
      console.warn(`Gramads API returned status ${response.status} for chat ${chatId}`)
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

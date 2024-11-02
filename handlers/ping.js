const { stats } = require('../middlewares')

module.exports = async ctx => {
  try {
    const webhookInfo = await ctx.telegram.getWebhookInfo()

    const { requests, messages, queue } = await stats.getStats()

    // Helper function to format numbers safely
    const formatNumber = (num) => {
      return (typeof num === 'number' && !isNaN(num)) ? num.toFixed(2) : 'N/A'
    }

    const message = `🏓 *Pong*

*Performance Metrics:*
┌─ Requests
│  • RPS:      \`${formatNumber(requests.rps)}\`
│  • Avg Time: \`${formatNumber(requests.avgTime)} ms\`
│  • 95p Time: \`${formatNumber(requests.percentile95)} ms\`
│
├─ Messages
│  • MPS:      \`${formatNumber(messages.mps)}\`
│  • Avg Time: \`${formatNumber(messages.avgTime)} ms\`
│  • 95p Time: \`${formatNumber(messages.percentile95)} ms\`
│
└─ Queue
   • Pending:  \`${webhookInfo.pending_update_count || queue.pending || 'N/A'}\``

    const response = await ctx.replyWithMarkdown(message, {
      reply_to_message_id: ctx.message.message_id
    })

    // delete the message after 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000))
    await ctx.telegram.deleteMessage(ctx.chat.id, response.message_id)
    await ctx.deleteMessage()
  } catch (error) {
    console.error('Error in ping command:', error)
  }
}

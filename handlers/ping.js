module.exports = async ctx => {
  const webhookInfo = await ctx.telegram.getWebhookInfo()

  const { rps, rta, rt95p, mps, mrs, mr95p } = ctx.stats

  // Helper function to format numbers safely
  const formatNumber = (num) => {
    return isNaN(num) ? 'N/A' : num.toFixed(2)
  }

  const message = `🏓 *Pong*

*Performance Metrics:*
┌─ Requests
│  • RPS:      \`${formatNumber(rps)}\`
│  • Avg Time: \`${formatNumber(rta)} ms\`
│  • 95p Time: \`${formatNumber(rt95p)} ms\`
│
├─ Messages
│  • MPS:      \`${formatNumber(mps)}\`
│  • Avg Time: \`${formatNumber(mrs)} ms\`
│  • 95p Time: \`${formatNumber(mr95p)} ms\`
│
└─ Queue
   • Pending:  \`${webhookInfo.pending_update_count}\``

  const response = await ctx.replyWithMarkdown(message, {
    reply_to_message_id: ctx.message.message_id
  })

  // delete the message after 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000))
  await ctx.telegram.deleteMessage(ctx.chat.id, response.message_id)
  await ctx.deleteMessage()
}

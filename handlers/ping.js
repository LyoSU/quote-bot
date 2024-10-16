module.exports = async ctx => {
  const webhookInfo = await ctx.telegram.getWebhookInfo()

  const { rps, rta, rt95p, mps, mrs, mr95p } = ctx.stats

  // Helper function to create a visual bar
  const createBar = (value, max, size = 8) => {
    const filledCount = Math.round((value / max) * size)
    return '█'.repeat(filledCount) + '░'.repeat(size - filledCount)
  }

  // Assume some maximum values for the bars (adjust as needed)
  const maxRps = 100; const maxRt = 1000; const maxMps = 50; const maxPending = 1000

  const message = `🏓 *System Status*

*Performance Metrics:*
┌─ Requests
│  • RPS:      ${createBar(rps, maxRps)} \`${rps.toFixed(2)}\`
│  • Avg Time: ${createBar(rta, maxRt)} \`${rta.toFixed(2)} ms\`
│  • 95p Time: ${createBar(rt95p, maxRt)} \`${rt95p.toFixed(2)} ms\`
│
├─ Messages
│  • MPS:      ${createBar(mps, maxMps)} \`${mps.toFixed(2)}\`
│  • Avg Time: ${createBar(mrs, maxRt)} \`${mrs.toFixed(2)} ms\`
│  • 95p Time: ${createBar(mr95p, maxRt)} \`${mr95p.toFixed(2)} ms\`
│
└─ Queue
   • Pending:  ${createBar(webhookInfo.pending_update_count, maxPending)} \`${webhookInfo.pending_update_count}\`

📊 *Visual Summary:*
Requests/sec   ${createBar(rps, maxRps, 16)}
Messages/sec   ${createBar(mps, maxMps, 16)}
Response Time  ${createBar(rta, maxRt, 16)}
Queue Size     ${createBar(webhookInfo.pending_update_count, maxPending, 16)} `

  const response = await ctx.replyWithMarkdown(message, {
    reply_to_message_id: ctx.message.message_id
  })

  // delete the message after 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000))
  await ctx.telegram.deleteMessage(ctx.chat.id, response.message_id)
  await ctx.deleteMessage()
}

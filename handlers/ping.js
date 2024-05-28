module.exports = async ctx => {
  const webhookInfo = await ctx.telegram.getWebhookInfo()

  const { rps, rta, mps, mrs } = ctx.stats
  const message = `🏓 pong

✨ *Performance Metrics:*
- 🚀 *Requests per Second (RPS):* \`${rps.toFixed(0)}\`
- ⏱️ *Response Time:* \`${rta.toFixed(0)} ms\`
- 📈 *Messages per Second (MPS):* \`${mps.toFixed(0)}\`
- 🕒 *Average Response Time:* \`${mrs.toFixed(0)} ms\`

📥 *Queue Status:*
- 🔄 *Pending Updates:* \`${webhookInfo.pending_update_count}\`
`

  await ctx.replyWithMarkdown(message, {
    reply_to_message_id: ctx.message.message_id
  })
}

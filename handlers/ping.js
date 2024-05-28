module.exports = async ctx => {
  const webhookInfo = await ctx.telegram.getWebhookInfo()

  await ctx.replyWithHTML(`🏓 pong\n\nrps: ${ctx.stats.rps.toFixed(0)}\nresponse time: ${ctx.stats.rta.toFixed(0)} ms\nmessage per second: ${ctx.stats.mps.toFixed(0)} (response: ${ctx.stats.mrs.toFixed(0)} ms)\nupdates in the queue: ${webhookInfo.pending_update_count}`, {
    reply_to_message_id: ctx.message.message_id
  })
}

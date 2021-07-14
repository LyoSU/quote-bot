module.exports = async ctx => {
  const webhookInfo = await ctx.telegram.getWebhookInfo()

  await ctx.replyWithHTML(`🏓 pong\n\nrps: ${ctx.stats.rps.toFixed(0)}\nresponse time: ${ctx.stats.rta.toFixed(2)}\nupdates in the queue: ${webhookInfo.pending_update_count}`)
}

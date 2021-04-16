module.exports = async (ctx) => {
  const webhookInfo = await ctx.telegram.getWebhookInfo()

  await ctx.replyWithHTML(`🏓 pong\n\nrps: ${ctx.stats.rps}\response time: ${ctx.stats.rta}\rupdates in the queue: ${webhookInfo.pending_update_count}`)
}

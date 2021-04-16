module.exports = async (ctx) => {
  const webhookInfo = await ctx.telegram.getWebhookInfo()

  await ctx.replyWithHTML(`🏓 pong\n\nrps: ${ctx.stats.rps}\nresponse time: ${ctx.stats.rta}\nupdates in the queue: ${webhookInfo.pending_update_count}`)
}

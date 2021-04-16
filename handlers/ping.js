module.exports = async (ctx) => {
  const webhookInfo = await ctx.telegram.getWebhookInfo()

  await ctx.replyWithHTML(`🏓 pong\n\nrps: ${ctx.stats.rps}\nrps: ${ctx.stats.rta}\nupdate: ${webhookInfo.pending_update_count}`)
}

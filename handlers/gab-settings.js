module.exports = async ctx => {
  let gab = 0
  if (ctx.match && ctx.match[2]) gab = ctx.match[2]

  ctx.group.info.settings.randomQuoteGab = gab

  await ctx.replyWithHTML(ctx.i18n.t('random.gab', { gab }), {
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true
  })
}

module.exports = async ctx => {
  let backgroundColor = '//#292232'
  if (ctx.match && ctx.match[1] === '#' && ctx.match[2]) {
    backgroundColor = `#${ctx.match[2]}`
  } else if (ctx.match && ctx.match[2]) backgroundColor = `${ctx.match[2]}`

  if (ctx.group) {
    ctx.group.info.settings.quote.backgroundColor = backgroundColor
  } else {
    ctx.session.userInfo.settings.quote.backgroundColor = backgroundColor
  }

  await ctx.replyWithHTML(ctx.i18n.t('quote.set_background_color', { backgroundColor }), {
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true
  })
}

module.exports = async (ctx) => {
  if (['supergroup', 'group'].includes(ctx.chat.type)) {
    const chatMember = await ctx.tg.getChatMember(
      ctx.message.chat.id,
      ctx.message.from.id
    ).catch(console.log)

    if (chatMember && !['creator', 'administrator'].includes(chatMember.status)) {
      ctx.replyWithHTML(ctx.i18n.t('only_admin'), {
        reply_to_message_id: ctx.message.message_id
      })
      return
    }
  }

  let backgroundColor = '#130f1c'
  if (ctx.match && ctx.match[1] === '#' && ctx.match[2]) backgroundColor = `#${ctx.match[2]}`
  else if (ctx.match && ctx.match[2]) backgroundColor = `${ctx.match[2]}`

  if (ctx.group) ctx.group.info.settings.quote.backgroundColor = backgroundColor
  else ctx.session.userInfo.settings.quote.backgroundColor = backgroundColor

  ctx.replyWithHTML(ctx.i18n.t('quote.set_backgroun_color', { backgroundColor }), {
    reply_to_message_id: ctx.message.message_id
  })
}

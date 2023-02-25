module.exports = async (ctx, next) => {
  if (['supergroup', 'group'].includes(ctx.chat.type)) {
    const chatMember = await ctx.tg.getChatMember(
      ctx.message.chat.id,
      ctx.message.from.id
    ).catch(console.log)

    if (chatMember && ['creator', 'administrator'].includes(chatMember.status)) {
      return next()
    } else {
      await ctx.replyWithHTML(ctx.i18n.t('only_admin'), {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      })
    }
  } else {
    return next()
  }
}

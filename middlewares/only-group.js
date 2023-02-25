module.exports = async (ctx, next) => {
  if (['supergroup', 'group'].includes(ctx.chat.type)) {
    return next()
  } else {
    await ctx.replyWithHTML(ctx.i18n.t('only_group'), {
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true
    })
  }
}

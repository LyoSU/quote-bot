module.exports = async (ctx, next) => {
  if (['supergroup', 'group'].includes(ctx.chat.type)) {
    return next()
  } else {
    ctx.replyWithHTML(ctx.i18n.t('only_group'), {
      reply_to_message_id: ctx.message.message_id
    })
  }
}

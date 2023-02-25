module.exports = async ctx => {
  const uncleanUserInput = ctx.message.text.substring(0, 15)

  const emojiRegExp = /(random|\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g
  const emojiSymbols = uncleanUserInput.match(emojiRegExp)

  if (!emojiSymbols) {
    return ctx.replyWithHTML(ctx.i18n.t('emoji.info'), {
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true
    })
  }

  const emoji = emojiSymbols.join('')

  if (ctx.group) {
    ctx.group.info.settings.quote.emojiSuffix = emoji
  } else {
    ctx.session.userInfo.settings.quote.emojiSuffix = emoji
  }

  await ctx.replyWithHTML(ctx.i18n.t('emoji.done'), {
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true
  })
}

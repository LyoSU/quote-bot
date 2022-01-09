module.exports = async ctx => {
  let emojiBrand = 'apple'

  const match = ctx.message.text.split(' ')

  if (match && [
    'apple',
    'google',
    'twitter'
  ].includes(match[1])) {
    emojiBrand = match[1]
  }

  if (ctx.group) {
    ctx.group.info.settings.quote.emojiBrand = emojiBrand
  } else {
    ctx.session.userInfo.settings.quote.emojiBrand = emojiBrand
  }

  await ctx.replyWithHTML(ctx.i18n.t('quote.set_emoji_brand', { emojiBrand }), {
    reply_to_message_id: ctx.message.message_id
  })
}

const { InlineKeyboard } = require('grammy')

module.exports = async ctx => {
  const resultText = ctx.i18n.t('top.info')

  await ctx.api.sendMessage(ctx.chat.id, resultText, {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.msg.message_id,
    allow_sending_without_reply: true,
    reply_markup: new InlineKeyboard()
      .switchInline(ctx.i18n.t('top.open'), `top:${ctx.group.info.id}`)
  })
}

const Markup = require('telegraf/markup')

module.exports = async ctx => {
  const resultText = ctx.i18n.t('top.info')

  await ctx.replyWithHTML(resultText, {
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true,
    reply_markup: Markup.inlineKeyboard([
      Markup.switchToCurrentChatButton(
        ctx.i18n.t('top.open'),
        `top:${ctx.group.info.id}`
      )
    ])
  })
}

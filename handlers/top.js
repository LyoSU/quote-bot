const Markup = require('telegraf/markup')
const deepLink = require('../helpers/deep-link')

module.exports = async ctx => {
  const resultText = ctx.i18n.t('top.info')

  const rows = [[
    Markup.switchToCurrentChatButton(
      ctx.i18n.t('top.open'),
      `top:${ctx.group.info.id}`
    )
  ]]
  if (ctx.group.info._id && ctx.botInfo && ctx.botInfo.username) {
    rows.push([
      Markup.urlButton(
        ctx.i18n.t('app.open_group'),
        deepLink.forGroup(ctx.botInfo.username, String(ctx.group.info._id))
      )
    ])
  }

  await ctx.replyWithHTML(resultText, {
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true,
    reply_markup: Markup.inlineKeyboard(rows)
  })
}

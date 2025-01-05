const Markup = require('telegraf/markup')

module.exports = async ctx => {
  const getMe = await ctx.telegram.getMe()

  await ctx.replyWithHTML(ctx.i18n.t('start'), {
    disable_web_page_preview: true,
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true,
    reply_markup: Markup.inlineKeyboard([
      Markup.urlButton(
        ctx.i18n.t('btn.add_group'),
        `https://t.me/${getMe.username}?startgroup=add`
      )
    ])
  })
}

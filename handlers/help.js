const Markup = require('telegraf/markup')

module.exports = async (ctx) => {
  if (ctx.updateType === 'callback_query') {
    await ctx.editMessageText(ctx.i18n.t('help'), {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        Markup.urlButton(
          ctx.i18n.t('btn.add_group'),
          `https://t.me/${ctx.options.username}?startgroup=add`
        )
      ])
    })
  } else {
    await ctx.replyWithHTML(ctx.i18n.t('help'), {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: Markup.inlineKeyboard([
        Markup.urlButton(
          ctx.i18n.t('btn.add_group'),
          `https://t.me/${ctx.options.username}?startgroup=add`
        )
      ])
    })
  }
}

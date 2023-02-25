const Markup = require('telegraf/markup')

module.exports = async ctx => {
  if (ctx.updateType === 'callback_query') {
    await ctx.editMessageText(ctx.i18n.t('help'), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: Markup.inlineKeyboard([
        Markup.urlButton(
          ctx.i18n.t('btn.add_group'),
          `https://t.me/${ctx.options.username}?startgroup=add`
        )
      ])
    })
  } else if (ctx.group) {
    await ctx.replyWithHTML(ctx.i18n.t('help_group', {
      username: ctx.options.username
    }), {
      disable_web_page_preview: true,
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true,
      reply_markup: Markup.inlineKeyboard([
        Markup.urlButton(
          ctx.i18n.t('btn.help'),
          `https://t.me/${ctx.options.username}?start=help`
        )
      ])
    })
  } else {
    await ctx.replyWithHTML(ctx.i18n.t('help'), {
      disable_web_page_preview: true,
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true,
      reply_markup: Markup.inlineKeyboard([
        Markup.urlButton(
          ctx.i18n.t('btn.add_group'),
          `https://t.me/${ctx.options.username}?startgroup=add`
        )
      ])
    })
  }
}

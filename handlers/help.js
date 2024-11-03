const { InlineKeyboard } = require('grammy')

module.exports = async (ctx) => {
  const me = await ctx.api.getMe()

  if (ctx.callbackQuery) {
    await ctx.editMessageText(ctx.t('help'), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: new InlineKeyboard()
        .url(ctx.t('btn.add_group'), `https://t.me/${me.username}?startgroup=add`)
    })
  } else if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    await ctx.reply(ctx.t('help_group', {
      username: me.username
    }), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_to_message_id: ctx.msg.message_id,
      reply_markup: new InlineKeyboard()
        .url(ctx.t('btn.help'), `https://t.me/${me.username}?start=help`)
    })
  } else {
    await ctx.reply(ctx.t('help'), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_to_message_id: ctx.msg.message_id,
      reply_markup: new InlineKeyboard()
        .url(ctx.t('btn.add_group'), `https://t.me/${me.username}?startgroup=add`)
    })
  }
}

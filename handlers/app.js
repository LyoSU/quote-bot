const Markup = require('telegraf/markup')
const deepLink = require('../helpers/deep-link')

// /app — short-circuit to the webapp. In a group: links to that group's
// feed. Elsewhere: links to the user's personal root.
module.exports = async ctx => {
  const botUsername = ctx.botInfo && ctx.botInfo.username
  if (!botUsername) return

  const inGroup = ctx.group && ctx.group.info && ctx.group.info._id
  const url = inGroup
    ? deepLink.forGroup(botUsername, String(ctx.group.info._id))
    : deepLink.forRoot(botUsername)
  const label = inGroup ? ctx.i18n.t('app.open_group') : ctx.i18n.t('app.open_root')

  await ctx.replyWithHTML(ctx.i18n.t('app.info'), {
    reply_to_message_id: ctx.message && ctx.message.message_id,
    allow_sending_without_reply: true,
    disable_web_page_preview: true,
    reply_markup: Markup.inlineKeyboard([[Markup.urlButton(label, url)]])
  })
}

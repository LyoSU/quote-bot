const Markup = require('telegraf/markup')
const deepLink = require('../helpers/deep-link')

module.exports = async ctx => {
  const quoteId = ctx.match[1].split('@')[0]

  const quote = await ctx.db.Quote.findById(quoteId).catch(() => {})

  if (!quote) return

  const rows = [[
    Markup.callbackButton(`👍 ${quote.rate.votes[0].vote.length}`, 'rate:👍'),
    Markup.callbackButton(`👎 ${quote.rate.votes[1].vote.length}`, 'rate:👎')
  ]]
  if (quote.local_id != null && quote.group && ctx.botInfo && ctx.botInfo.username) {
    rows.push([
      Markup.urlButton(
        ctx.i18n.t('app.open_quote'),
        deepLink.forQuote(ctx.botInfo.username, String(quote.group), quote.local_id)
      )
    ])
  }

  await ctx.replyWithDocument(quote.file_id, {
    reply_markup: Markup.inlineKeyboard(rows),
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true
  })
}

const Markup = require('telegraf/markup')

module.exports = async (ctx) => {
  let packLink = 'https://t.me/addstickers/'
  if (ctx.group.info.topSet && ctx.group.info.topSet.name) {
    packLink += ctx.group.info.topSet.name
  }

  let resultText = ctx.i18n.t('top.info')

  const topQuote = await ctx.db.Quote.find({
    group: ctx.group.info._id
  }).sort({
    'rate.score': -1
  }).limit(10)

  topQuote.forEach((quote) => {
    resultText += `\n/q_${quote.id} (${quote.rate.votes[0].vote.length}/${quote.rate.votes[1].vote.length})`
  })

  await ctx.replyWithHTML(resultText, {
    reply_to_message_id: ctx.message.message_id,
    reply_markup: Markup.inlineKeyboard([
      Markup.urlButton(
        ctx.i18n.t('top.pack'),
        packLink
      )
    ])
  })
}

module.exports = async (ctx) => {
  let resultText = `${ctx.i18n.t('top')}`

  const topQuote = await ctx.db.Quote.find({
    group: ctx.group.info._id
  }).sort({
    'rate.score': -1
  }).limit(10)

  topQuote.map((quote) => {
    resultText += `\n/q_${quote.id} (${quote.rate.votes[0].vote.length}/${quote.rate.votes[1].vote.length})`
  })

  ctx.replyWithHTML(resultText, {
    reply_to_message_id: ctx.message.message_id
  })
}

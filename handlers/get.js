const { InlineKeyboard } = require('grammy')

module.exports = async ctx => {
  const quoteId = ctx.match[1].split('@')[0]

  const quote = await ctx.db.Quote.findById(quoteId).catch(() => {})

  if (quote) {
    await ctx.replyWithDocument(quote.file_id, {
      reply_markup: new InlineKeyboard()
        .text(`👍 ${quote.rate.votes[0].vote.length}`, 'rate:👍')
        .text(`👎 ${quote.rate.votes[1].vote.length}`, 'rate:👎'),
      reply_to_message_id: ctx.msg.message_id,
      allow_sending_without_reply: true
    })
  }
}

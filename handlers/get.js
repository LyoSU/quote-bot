module.exports = async (ctx) => {
  const quoteId = ctx.match[1].split('@')[0]

  const quote = await ctx.db.Quote.findById(quoteId).catch(() => {})

  if (quote) {
    ctx.replyWithDocument(quote.file_id, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: `👍 ${quote.rate.votes[0].vote.length}`, callback_data: 'rate:👍' },
            { text: `👎 ${quote.rate.votes[1].vote.length}`, callback_data: 'rate:👎' }
          ]
        ]
      },
      reply_to_message_id: ctx.message.message_id
    })
  }
}

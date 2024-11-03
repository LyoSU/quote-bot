const { Composer, InlineKeyboard } = require('grammy')

const composer = new Composer()

composer.on('inline_query', async (ctx) => {
  const offset = parseInt(ctx.inlineQuery.offset) || 0
  const limit = 50
  const results = []

  if (ctx.inlineQuery.query.match(/top:(.*)/)) {
    const groupId = ctx.inlineQuery.query.match(/top:(.*)/)
    const group = await ctx.db.Group.findById(groupId[1])

    if (group) {
      const topQuote = await ctx.db.Quote.find({
        group,
        'rate.score': { $gt: 0 }
      })
      .sort({ 'rate.score': -1 })
      .limit(limit)
      .skip(offset)

      results.push(...topQuote.map(quote => ({
        type: 'sticker',
        id: quote._id,
        sticker_file_id: quote.file_id,
        reply_markup: new InlineKeyboard()
          .text(`👍 ${quote.rate.votes[0].vote.length || ''}`, `irate:${quote._id}:👍`)
          .text(`👎 ${quote.rate.votes[1].vote.length || ''}`, `irate:${quote._id}:👎`)
      })))
    }
  }

  await ctx.answerInlineQuery(results, {
    cache_time: 300,
    next_offset: offset + limit
  })
})

module.exports = composer

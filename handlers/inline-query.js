const Composer = require('telegraf/composer')
const Markup = require('telegraf/markup')

const composer = new Composer()

composer.on('inline_query', async (ctx) => {
  const offset = parseInt(ctx.inlineQuery.offset) || 0
  const limit = 50
  const stickersResult = []

  if (ctx.inlineQuery.query.match(/top:(.*)/)) {
    const groupId = ctx.inlineQuery.query.match(/top:(.*)/)
    const group = await ctx.db.Group.findById(groupId[1]).catch(() => {})

    if (group) {
      const topQuote = await ctx.db.Quote.find({
        group,
        'rate.score': { $gt: 0 }
      }).sort({
        'rate.score': -1
      }).limit(limit).skip(offset)

      topQuote.forEach(quote => {
        stickersResult.push({
          type: 'sticker',
          id: quote._id,
          sticker_file_id: quote.file_id,
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.callbackButton(`👍 ${quote.rate.votes[0].vote.length || ''}`, `irate:${quote._id}:👍`),
              Markup.callbackButton(`👎 ${quote.rate.votes[1].vote.length || ''}`, `irate:${quote._id}:👎`)
            ]
          ])
        })
      })

      ctx.state.answerIQ = [stickersResult, {
        is_personal: false,
        cache_time: 60 * 5,
        next_offset: offset + limit
      }]
    }
  }

  if (stickersResult.length === 0) {
    const likedQuote = await ctx.db.Quote.find({ 'rate.votes.0.vote': ctx.session.userInfo._id.toString() }).sort({
      'rate.score': -1
    }).limit(limit).skip(offset)

    likedQuote.forEach(quote => {
      stickersResult.push({
        type: 'sticker',
        id: quote._id,
        sticker_file_id: quote.file_id,
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.callbackButton(`👍 ${quote.rate.votes[0].vote.length || ''}`, `irate:${quote._id}:👍`),
            Markup.callbackButton(`👎 ${quote.rate.votes[1].vote.length || ''}`, `irate:${quote._id}:👎`)
          ]
        ])
      })
    })

    ctx.state.answerIQ = [stickersResult, {
      is_personal: true,
      cache_time: 5,
      next_offset: offset + limit,
    }]
  }
})

module.exports = composer

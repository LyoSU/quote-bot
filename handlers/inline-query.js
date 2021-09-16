const Composer = require('telegraf/composer')

const composer = new Composer()

composer.on('inline_query', async (ctx) => {
  const stickersResult = []

  if (ctx.inlineQuery.query.match(/top:(.*)/)) {
    const groupId = ctx.inlineQuery.query.match(/top:(.*)/)
    const group = await ctx.db.Group.findOne({ group_id: groupId[1] })

    if (group) {
      const topQuote = await ctx.db.Quote.find({
        group,
        'rate.score': { $gt: 0 }
      }).sort({
        'rate.score': -1
      }).limit(50)

      topQuote.forEach(quote => {
        stickersResult.push({
          type: 'sticker',
          id: quote._id,
          sticker_file_id: quote.file_id
        })
      })

      ctx.state.answerIQ = [stickersResult, {
        is_personal: false,
        cache_time: 60 * 5
      }]
    }
  }

  if (stickersResult.length === 0) {
    const likedQuote = await ctx.db.Quote.find({ 'rate.votes.vote.0': ctx.session.userInfo._id.toString() }).sort({
      'rate.score': -1
    }).limit(50)

    likedQuote.forEach(quote => {
      stickersResult.push({
        type: 'sticker',
        id: quote._id,
        sticker_file_id: quote.file_id
      })
    })

    ctx.state.answerIQ = [stickersResult, {
      is_personal: true,
      cache_time: 60 * 5
    }]
  }
})

module.exports = composer

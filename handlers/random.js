const { InlineKeyboard } = require('grammy')
const { randomInt } = require('crypto')

module.exports = async (ctx, next) => {
  if (!ctx.group.info) {
    return next()
  }

  const count = await ctx.db.Quote.countDocuments({
    group: ctx.group.info._id,
    'rate.score': { $gt: 0 }
  })

  let groupQuotes

  if (count > 0) {
    const skip = randomInt(0, count)

    groupQuotes = await ctx.db.Quote.find({
      group: ctx.group.info._id,
      'rate.score': { $gt: 0 }
    }).skip(skip).limit(10)
  } else {
    groupQuotes = []
  }

  if (groupQuotes.length > 0) {
    const quote = groupQuotes[randomInt(0, groupQuotes.length)]

    let adv, advKeyboard

    if (randomInt(0, 30) === 0) {
      adv = (await ctx.db.Adv.aggregate([
        {
          $match: {
            status: 2,
            locale: ctx.i18n.locale() || 'en'
          }
        },
        { $sample: { size: 1 } }
      ]))[0]
    }

    const keyboard = new InlineKeyboard()
      .row()
      .text(`👍 ${quote.rate.votes[0].vote.length || ''}`, 'rate:👍')
      .text(`👎 ${quote.rate.votes[1].vote.length || ''}`, 'rate:👎')

    if (adv) {
      keyboard.row().url(adv.text, adv.link)
    }

    await ctx.replyWithDocument(quote.file_id, {
      reply_markup: keyboard,
      reply_to_message_id: ctx.msg.message_id,
      allow_sending_without_reply: true
    })

    if (adv) {
      await ctx.db.Adv.updateOne(
        { _id: adv._id },
        { $inc: { 'stats.impressions': 1 } }
      )
    }
  } else {
    if (!ctx.state.randomQuote) {
      await ctx.replyWithHTML(ctx.i18n.t('random.empty'), {
        reply_to_message_id: ctx.msg.message_id,
        allow_sending_without_reply: true
      })
    }
  }
}

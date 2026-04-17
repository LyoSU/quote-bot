const Markup = require('telegraf/markup')
const { randomInt } = require('crypto')

module.exports = async (ctx, next) => {
  if (!ctx.group.info) {
    return next()
  }

  const [quote] = await ctx.db.Quote.aggregate([
    { $match: { group: ctx.group.info._id, 'rate.score': { $gt: 0 } } },
    { $sample: { size: 1 } }
  ])

  if (!quote) {
    if (!ctx.state.randomQuote) {
      await ctx.replyWithHTML(ctx.i18n.t('random.empty'), {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      })
    }
    return
  }

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

  if (adv) advKeyboard = Markup.urlButton(adv.text, adv.link)

  await ctx.replyWithDocument(quote.file_id, {
    reply_markup: Markup.inlineKeyboard([
      [
        Markup.callbackButton(`👍 ${quote.rate.votes[0].vote.length || ''}`, 'rate:👍'),
        Markup.callbackButton(`👎 ${quote.rate.votes[1].vote.length || ''}`, 'rate:👎')
      ],
      advKeyboard ? [advKeyboard] : []
    ]),
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true
  })

  if (adv) {
    await ctx.db.Adv.updateOne({ _id: adv._id }, { $inc: { 'stats.impressions': 1 } })
  }
}

const Markup = require('telegraf/markup')

module.exports = async (ctx) => {
  const randomQuote = await ctx.db.Quote.aggregate(
    [
      {
        $match: {
          $and: [
            { group: ctx.group.info._id },
            { 'rate.score': { $gt: 0 } }
          ]
        }
      },
      { $sample: { size: 15 } }
    ]
  )
  const quote = randomQuote[Math.floor(Math.random() * randomQuote.length)]

  if (quote) {
    let advKeyboard

    const adv = await ctx.db.Adv.aggregate(
      [
        {
          $match: {
            status: 2
          }
        },
        { $sample: { size: 1 } }
      ]
    )

    if (adv.length > 0) advKeyboard = Markup.urlButton(adv[0].text, adv[0].link)

    await ctx.replyWithDocument(quote.file_id, {
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.callbackButton(`👍 ${quote.rate.votes[0].vote.length || ''}`, 'rate:👍'),
          Markup.callbackButton(`👎 ${quote.rate.votes[1].vote.length || ''}`, 'rate:👎')
        ],
        advKeyboard ? [advKeyboard] : []
      ]),
      reply_to_message_id: ctx.message.message_id
    })

    adv.stats.impressions += 1
    adv.save()
  } else {
    ctx.replyWithHTML(ctx.i18n.t('random.empty'), {
      reply_to_message_id: ctx.message.message_id
    })
  }
}

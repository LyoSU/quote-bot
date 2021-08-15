const Markup = require('telegraf/markup')
const { randomInt } = require('crypto')

module.exports = async ctx => {
  const groupQuotes = await ctx.db.Quote.aggregate(
    [
      {
        $match: {
          $and: [
            { group: ctx.group.info._id },
            { 'rate.score': { $gt: 0 } }
          ]
        }
      },
      { $sample: { size: 100 } }
    ]
  )
  const quote = groupQuotes[randomInt(0, groupQuotes.length - 1)]

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
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true
    })

    adv.stats.impressions += 1
    adv.save()
  } else {
    await ctx.replyWithHTML(ctx.i18n.t('random.empty'), {
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true
    })
  }
}

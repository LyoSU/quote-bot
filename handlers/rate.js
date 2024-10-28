module.exports = async ctx => {
  let resultText = ''
  const rateType = ctx.match[1]

  let quoteDb, rateName

  if (rateType === 'irate') {
    rateName = ctx.match[3]

    quoteDb = await ctx.db.Quote.findById(ctx.match[2])

    if (!quoteDb) return
  } else {
    rateName = ctx.match[2]

    const sticker = ctx.callbackQuery.message.sticker
    quoteDb = await ctx.db.Quote.findOne({ file_unique_id: sticker.file_unique_id })

    if (!quoteDb) return
  }

  quoteDb.rate.votes.map((rate) => {
    const indexRate = rate.vote.indexOf(ctx.session.userInfo.id)
    if (indexRate > -1) rate.vote.splice(indexRate, 1)
    if (rateName === rate.name) {
      if (indexRate > -1) {
        resultText = ctx.i18n.t('rate.vote.back')
      } else {
        resultText = ctx.i18n.t('rate.vote.rated', { rateName })
        rate.vote.push(ctx.session.userInfo.id)
      }
    }
  })

  quoteDb.markModified('rate')

  quoteDb.rate.score = quoteDb.rate.votes[0].vote.length - quoteDb.rate.votes[1].vote.length

  await quoteDb.save()

  ctx.state.answerCbQuery = [resultText]

  if (rateType === 'irate') {
    await ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [
          {
            text: `👍 ${quoteDb.rate.votes[0].vote.length || ''}`,
            callback_data: `irate:${quoteDb._id}:👍`
          },
          {
            text: `👎 ${quoteDb.rate.votes[1].vote.length || ''}`,
            callback_data: `irate:${quoteDb._id}:👎`
          }
        ]
      ]
    }).catch(() => {})
  } else {
    const advKeyboard = ctx.callbackQuery.message.reply_markup.inline_keyboard.pop().pop()

    await ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [
          {
            text: `👍 ${quoteDb.rate.votes[0].vote.length || ''}`,
            callback_data: 'rate:👍'
          },
          {
            text: `👎 ${quoteDb.rate.votes[1].vote.length || ''}`,
            callback_data: 'rate:👎'
          }
        ],
        advKeyboard.url ? [advKeyboard] : []
      ]
    }).catch(() => {})
  }
}

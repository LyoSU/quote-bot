module.exports = async (ctx) => {
  let resultText = ''
  const rateName = ctx.match[2]

  const sticker = ctx.callbackQuery.message.sticker

  const quoteDb = await ctx.db.Quote.findOne({ file_unique_id: sticker.file_unique_id })

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

  ctx.answerCbQuery(resultText)

  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        { text: `👍 ${quoteDb.rate.votes[0].vote.length}`, callback_data: 'rate:👍' },
        { text: `👎 ${quoteDb.rate.votes[1].vote.length}`, callback_data: 'rate:👎' }
      ]
    ]
  })
}

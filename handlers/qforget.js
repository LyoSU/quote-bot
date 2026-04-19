module.exports = async (ctx) => {
  if (!ctx.group || !ctx.group.info) return

  const match = (ctx.message.text || '').match(/\/qforget(?:@\S+)?\s+#?(\d+)/i)
  if (!match) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.usage'), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  const local = parseInt(match[1], 10)

  const quote = await ctx.db.Quote.findOne({
    group: ctx.group.info._id,
    local_id: local
  }).lean()

  if (!quote) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.not_found', { local }), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  if (quote.forgottenAt) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.already_forgotten', { local }), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  if (!quote.payload) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.not_yet_archived', { local }), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  const requesterId = ctx.from && ctx.from.id
  const isAuthor = Array.isArray(quote.authors) &&
    quote.authors.some(a => a && a.telegram_id === requesterId)

  if (!isAuthor) {
    return ctx.replyWithHTML(ctx.i18n.t('qforget.not_author'), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  await ctx.db.Quote.updateOne(
    { _id: quote._id },
    {
      $unset: { payload: 1, authors: 1, source: 1 },
      $set: { hasVoice: false, hasMedia: false, forgottenAt: new Date() }
    }
  )

  return ctx.replyWithHTML(ctx.i18n.t('qforget.forgotten', { local }), {
    reply_to_message_id: ctx.message.message_id
  }).catch(() => {})
}

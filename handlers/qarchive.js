module.exports = async (ctx) => {
  if (!ctx.group || !ctx.group.info) return

  const parts = (ctx.message.text || '').trim().split(/\s+/).slice(1)
  const arg = (parts[0] || '').toLowerCase()

  const current = ctx.group.info.settings?.archive?.storeText ?? true

  if (arg === 'on' || arg === 'off') {
    const next = arg === 'on'
    await ctx.db.Group.updateOne(
      { _id: ctx.group.info._id },
      { $set: { 'settings.archive.storeText': next } }
    )
    ctx.group.info.settings = ctx.group.info.settings || {}
    ctx.group.info.settings.archive = { storeText: next }
    return ctx.replyWithHTML(ctx.i18n.t(next ? 'qarchive.on' : 'qarchive.off'), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  if (!arg) {
    return ctx.replyWithHTML(ctx.i18n.t(current ? 'qarchive.status_on' : 'qarchive.status_off'), {
      reply_to_message_id: ctx.message.message_id
    }).catch(() => {})
  }

  return ctx.replyWithHTML(ctx.i18n.t('qarchive.usage'), {
    reply_to_message_id: ctx.message.message_id
  }).catch(() => {})
}

// Resolves ctx.group.info for the current chat. Upserts the Group doc so
// subsequent atomic ops (e.g. $inc on quoteCounter in handlers/quote.js)
// always hit a persisted row. Never calls .save() on the Mongoose doc — a
// full-doc save would race with concurrent $inc writes and overwrite fields
// outside this handler's ownership (quoteCounter, topSet, etc.).

module.exports = async ctx => {
  if (ctx.db.connection.readyState !== 1) {
    console.warn('Database not ready, skipping group lookup')
    return false
  }

  const group = await ctx.db.Group.findOneAndUpdate(
    { group_id: ctx.chat.id },
    {
      $set: {
        title: ctx.chat.title,
        username: ctx.chat.username,
        updatedAt: new Date()
      },
      $setOnInsert: {
        group_id: ctx.chat.id
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  ctx.group.info = group

  if (group.settings && group.settings.locale) {
    ctx.i18n.locale(group.settings.locale)
  } else if (ctx.i18n.languageCode) {
    const locale = ctx.i18n.shortLanguageCode || ctx.i18n.languageCode
    await ctx.db.Group.updateOne(
      { _id: group._id },
      { $set: { 'settings.locale': locale } }
    )
    if (!group.settings) group.settings = {}
    group.settings.locale = locale
  }

  return true
}

// Persists a single change to ctx.session.userInfo to MongoDB via a targeted
// updateOne. Settings handlers (privacy, hidden, color, emoji, language)
// mutate the in-memory doc and call this to make the change durable. Avoids
// full-doc save() races between concurrent workers.
//
// Pass a flat $set payload using dotted Mongo paths, e.g.
//   persistUserSetting(ctx, { 'settings.privacy': true })

module.exports = function persistUserSetting (ctx, $set) {
  if (!ctx.session || !ctx.session.userInfo || !ctx.session.userInfo._id) return null
  return ctx.db.User.updateOne({ _id: ctx.session.userInfo._id }, { $set })
    .catch((err) => console.warn('[settings] User.updateOne failed:', err && err.message))
}

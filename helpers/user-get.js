// Resolves ctx.session.userInfo for the current user. For brand-new users
// performs an immediate insert (we need the _id for downstream handlers).
// For existing users, profile field syncing (first_name/last_name/etc.) is
// done by handler.js middleware via targeted User.updateOne — never by
// full-doc save() on this cached mongoose doc, which would race with
// concurrent updates from other workers handling parallel updates from
// the same user (VersionError).

module.exports = async ctx => {
  let user

  if (!ctx.session.userInfo) {
    user = await ctx.db.User.findOne({ telegram_id: ctx.from.id })
  } else {
    user = ctx.session.userInfo
  }

  if (!user) {
    const now = Math.floor(new Date().getTime() / 1000)
    user = new ctx.db.User()
    user.telegram_id = ctx.from.id
    user.first_act = now
    user.first_name = ctx.from.first_name
    user.last_name = ctx.from.last_name
    user.full_name = `${ctx.from.first_name}${ctx.from.last_name ? ` ${ctx.from.last_name}` : ''}`
    user.username = ctx.from.username
    if (ctx.chat && ctx.chat.type === 'private') user.status = 'member'
    await user.save()
  }

  ctx.session.userInfo = user

  if (ctx.session.userInfo.settings && ctx.session.userInfo.settings.locale) {
    ctx.i18n.locale(ctx.session.userInfo.settings.locale)
  }

  return true
}

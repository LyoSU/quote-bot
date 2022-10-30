module.exports = async ctx => {
  let group

  if (!ctx.group.info) group = await ctx.db.Group.findOne({ group_id: ctx.chat.id })
  else group = ctx.group.info

  if (!group) {
    group = new ctx.db.Group()
    group.group_id = ctx.chat.id
  }

  group.title = ctx.chat.title
  group.username = ctx.chat.username
  group.settings = group.settings || new ctx.db.Group().settings

  if (!group.username && !group.invite_link) {
    // group.invite_link = await ctx.telegram.exportChatInviteLink(ctx.chat.id).catch(() => {})
  }

  group.updatedAt = new Date()
  ctx.group.info = group
  if (ctx.group.info.settings.locale) ctx.i18n.locale(ctx.group.info.settings.locale)
  else if (ctx.i18n.languageCode) {
    ctx.group.info.settings.locale = ctx.i18n.shortLanguageCode ? ctx.i18n.shortLanguageCode : ctx.i18n.languageCode
    await group.save()
  }

  return true
}

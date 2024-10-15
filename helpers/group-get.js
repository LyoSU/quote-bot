module.exports = async ctx => {
  const { db, chat, i18n } = ctx

  const group = await db.Group.findOneAndUpdate(
    { group_id: chat.id },
    {
      $set: {
        title: chat.title,
        username: chat.username,
        updatedAt: new Date()
      },
      $setOnInsert: {
        settings: new db.Group().settings
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  )

  ctx.group.info = group

  const locale = group.settings.locale || i18n.shortLanguageCode || i18n.languageCode
  if (locale) {
    i18n.locale(locale)
    if (!group.settings.locale) {
      group.settings.locale = locale
      await group.save()
    }
  }

  return true
}

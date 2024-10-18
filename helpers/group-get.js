module.exports = async ctx => {
  const { db, chat, i18n } = ctx
  const now = Math.floor(Date.now() / 1000)

  const updateData = {
    title: chat.title,
    username: chat.username,
    updatedAt: new Date()
  }

  const group = await db.Group.findOneAndUpdate(
    { group_id: chat.id },
    {
      $set: updateData,
      $setOnInsert: {
        first_act: now,
        settings: new db.Group().settings
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      returnDocument: 'after'
    }
  )

  if (chat && chat.type === 'group') {
    group.status = 'active'
  }

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

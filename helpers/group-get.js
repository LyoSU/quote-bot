module.exports = async ctx => {
  const { db, chat, i18n, session } = ctx
  const now = Math.floor(Date.now() / 1000)

  if (!session.groupInfo) {
    const updateData = {
      title: chat.title,
      username: chat.username,
      updatedAt: new Date()
    }

    const group = await db.Group.findOneAndUpdate(
      { group_id: chat.id },
      {
        $set: updateData,
        $setOnInsert: { first_act: now }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    )

    if (chat && chat.type === 'group') {
      group.status = 'active'
    }

    session.groupInfo = group
  } else {
    Object.assign(session.groupInfo, {
      title: chat.title,
      username: chat.username,
      updatedAt: new Date()
    })

    if (chat && chat.type === 'group') {
      session.groupInfo.status = 'active'
    }
  }

  if (session.groupInfo.settings.locale) {
    i18n.locale(session.groupInfo.settings.locale)
  } else {
    const locale = i18n.shortLanguageCode || i18n.languageCode
    if (locale) {
      i18n.locale(locale)
      session.groupInfo.settings.locale = locale
      await session.groupInfo.save()
    }
  }

  return true
}

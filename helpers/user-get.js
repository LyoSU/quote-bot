module.exports = async ctx => {
  const { db, from, i18n, session, chat } = ctx
  const now = Math.floor(Date.now() / 1000)

  if (!session.userInfo) {
    const updateData = {
      first_name: from.first_name,
      last_name: from.last_name,
      full_name: `${from.first_name}${from.last_name ? ` ${from.last_name}` : ''}`,
      username: from.username,
      updatedAt: new Date()
    }

    const user = await db.User.findOneAndUpdate(
      { telegram_id: from.id },
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

    if (chat && chat.type === 'private') {
      user.status = 'member'
    }

    session.userInfo = user
  } else {
    Object.assign(session.userInfo, {
      first_name: from.first_name,
      last_name: from.last_name,
      full_name: `${from.first_name}${from.last_name ? ` ${from.last_name}` : ''}`,
      username: from.username,
      updatedAt: new Date()
    })

    if (chat && chat.type === 'private') {
      session.userInfo.status = 'member'
    }
  }

  if (session.userInfo.settings.locale) {
    i18n.locale(session.userInfo.settings.locale)
  }

  return true
}

const isGroup = (ctx) => ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'

const onlyGroup = (ctx, next) => {
  if (isGroup(ctx)) {
    return next()
  }
  return ctx.reply(ctx.i18n.t('only_group'))
}

const onlyAdmin = async (ctx, next) => {
  if (!ctx.from) return

  try {
    const member = await ctx.getChatMember(ctx.from.id)
    if (['creator', 'administrator'].includes(member.status)) {
      return next()
    }
    return ctx.reply(ctx.i18n.t('only_admin'))
  } catch (error) {
    console.error('Error checking admin rights:', error)
    return ctx.reply(ctx.i18n.t('error_admin_check'))
  }
}

module.exports = { onlyGroup, onlyAdmin }

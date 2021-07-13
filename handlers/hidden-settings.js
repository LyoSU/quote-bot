module.exports = async ctx => {
  if (ctx.group) {
    if (ctx.group.info.settings.hidden === true) {
      ctx.group.info.settings.hidden = false
      await ctx.replyWithHTML(ctx.i18n.t('hidden.settings.disable'))
    } else {
      ctx.group.info.settings.hidden = true
      await ctx.replyWithHTML(ctx.i18n.t('hidden.settings.enable'))
    }
  } else {
    if (ctx.session.userInfo.settings.hidden === true) {
      ctx.session.userInfo.settings.hidden = false
      await ctx.replyWithHTML(ctx.i18n.t('hidden.settings.disable'))
    } else {
      ctx.session.userInfo.settings.hidden = true
      await ctx.replyWithHTML(ctx.i18n.t('hidden.settings.enable'))
    }
  }
}

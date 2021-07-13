module.exports = async ctx => {
  if (ctx.group) {
    if (ctx.group.info.settings.privacy === true) {
      ctx.group.info.settings.privacy = false
      await ctx.replyWithHTML(ctx.i18n.t('privacy.settings.disable'))
    } else {
      ctx.group.info.settings.privacy = true
      await ctx.replyWithHTML(ctx.i18n.t('privacy.settings.enable'))
    }
  } else {
    if (ctx.session.userInfo.settings.privacy === true) {
      ctx.session.userInfo.settings.privacy = false
      await ctx.replyWithHTML(ctx.i18n.t('privacy.settings.disable'))
    } else {
      ctx.session.userInfo.settings.privacy = true
      await ctx.replyWithHTML(ctx.i18n.t('privacy.settings.enable'))
    }
  }
}

module.exports = async (ctx) => {
  if (ctx.session.userInfo.settings.privacy === true) {
    ctx.session.userInfo.settings.privacy = false
    ctx.replyWithHTML(ctx.i18n.t('privacy.settings.disable'))
  } else {
    ctx.session.userInfo.settings.privacy = true
    ctx.replyWithHTML(ctx.i18n.t('privacy.settings.enable'))
  }
}

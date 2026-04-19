const persistUserSetting = require('../helpers/persist-user-setting')

module.exports = async ctx => {
  if (ctx.group && ctx.group.info && ctx.group.info.settings) {
    if (ctx.group.info.settings.privacy === true) {
      ctx.group.info.settings.privacy = false
      await ctx.replyWithHTML(ctx.i18n.t('privacy.settings.disable'))
    } else {
      ctx.group.info.settings.privacy = true
      await ctx.replyWithHTML(ctx.i18n.t('privacy.settings.enable'))
    }
  } else if (ctx.session && ctx.session.userInfo && ctx.session.userInfo.settings) {
    const next = !ctx.session.userInfo.settings.privacy
    ctx.session.userInfo.settings.privacy = next
    persistUserSetting(ctx, { 'settings.privacy': next })
    await ctx.replyWithHTML(ctx.i18n.t(next ? 'privacy.settings.enable' : 'privacy.settings.disable'))
  }
}

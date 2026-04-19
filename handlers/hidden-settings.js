const persistUserSetting = require('../helpers/persist-user-setting')

module.exports = async ctx => {
  if (ctx.group && ctx.group.info && ctx.group.info.settings) {
    if (ctx.group.info.settings.hidden === true) {
      ctx.group.info.settings.hidden = false
      await ctx.replyWithHTML(ctx.i18n.t('hidden.settings.disable'))
    } else {
      ctx.group.info.settings.hidden = true
      await ctx.replyWithHTML(ctx.i18n.t('hidden.settings.enable'))
    }
  } else if (ctx.session && ctx.session.userInfo && ctx.session.userInfo.settings) {
    const next = !ctx.session.userInfo.settings.hidden
    ctx.session.userInfo.settings.hidden = next
    persistUserSetting(ctx, { 'settings.hidden': next })
    await ctx.replyWithHTML(ctx.i18n.t(next ? 'hidden.settings.enable' : 'hidden.settings.disable'))
  }
}

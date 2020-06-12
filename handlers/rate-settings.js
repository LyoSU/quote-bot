module.exports = async (ctx) => {
  if (ctx.group.info.settings.rate === true) {
    ctx.group.info.settings.rate = false
    ctx.replyWithHTML(ctx.i18n.t('rate.settings.disable'))
  } else {
    ctx.group.info.settings.rate = true
    ctx.replyWithHTML(ctx.i18n.t('rate.settings.enable'))
  }
}

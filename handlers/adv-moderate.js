const { Composer } = require('grammy')

const composer = new Composer()

composer.callbackQuery(/adv:moderate:accept:(.*)/, async ctx => {
  const adv = await ctx.db.Adv.findById(ctx.match[1]).populate('creator')
  adv.status = 1
  await adv.save()

  await ctx.api.sendMessage(adv.creator.telegram_id, ctx.i18n.t('adv.moderate.accepted'), {
    parse_mode: 'HTML'
  })
})

composer.callbackQuery(/adv:moderate:deny:(.*)/, async ctx => {
  const adv = await ctx.db.Adv.findById(ctx.match[1]).populate('creator')
  adv.status = -1
  await adv.save()
})

const onlyAdvMod = new Composer()
onlyAdvMod.use(composer.filter(ctx => {
  return ctx.session?.userInfo && ctx.session.userInfo.adv && ctx.session.userInfo.adv.moderator === true
}, composer))

module.exports = onlyAdvMod

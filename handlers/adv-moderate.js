const Composer = require('telegraf/composer')

const composer = new Composer()

composer.action(/adv:moderate:accept:(.*)/, async ctx => {
  const adv = await ctx.db.Adv.findById(ctx.match[1]).populate('creator')
  adv.status = 1
  await adv.save()

  await ctx.tg.sendMessage(adv.creator.telegram_id, ctx.i18n.t('adv.moderate.accepted'), {
    parse_mode: 'HTML'
  })
})

composer.action(/adv:moderate:deny:(.*)/, async ctx => {
  const adv = await ctx.db.Adv.findById(ctx.match[1]).populate('creator')
  adv.status = -1
  await adv.save()
})

const onlyAdvMod = new Composer()
onlyAdvMod.use(Composer.optional(ctx => {
  return ctx.session?.userInfo && ctx.session.userInfo.adv && ctx.session.userInfo.adv.moderator === true
}, composer))

module.exports = onlyAdvMod

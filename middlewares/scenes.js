const Stage = require('telegraf/stage')

module.exports = (...stages) => {
  const stage = new Stage([].concat(...stages))

  stage.use((ctx, next) => {
    if (!ctx.session.scene) ctx.session.scene = {}
    return next()
  })

  const cancel = async (ctx, next) => {
    ctx.session.scene = null
    await ctx.scene.leave()
    return next()
  }

  stage.command(['q', 'help', 'start', 'main', 'cancel', 'admin'], cancel)

  return stage
}

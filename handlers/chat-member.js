const { Composer } = require('grammy')
const composer = new Composer()

composer.on('my_chat_member', async (ctx, next) => {
  if (ctx.myChatMember.chat.id === ctx.myChatMember.from.id) {
    const user = await ctx.db.User.findOne({ telegram_id: ctx.myChatMember.from.id })
    user.status = ctx.myChatMember.new_chat_member.status
    await user.save()
  } else return next()
})

module.exports = composer

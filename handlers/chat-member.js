const Composer = require('telegraf/composer')
const composer = new Composer()

composer.use(async (ctx, next) => {
  if (ctx.update.my_chat_member) {
    if (ctx.update.my_chat_member.chat.id === ctx.update.my_chat_member.from.id) {
      const user = await ctx.db.User.findOne({ telegram_id: ctx.update.my_chat_member.from.id })

      user.status = ctx.update.my_chat_member.new_chat_member.status
      await user.save()
    }
  } else return next()
})

module.exports = composer

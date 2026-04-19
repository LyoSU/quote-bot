const Composer = require('telegraf/composer')
const composer = new Composer()

// my_chat_member updates fire when the user blocks/unblocks the bot in DM,
// or changes the bot's membership in a group. Persist the new status via
// targeted updateOne — full-doc save() would race with concurrent updates
// from the same user (same VersionError class as handler.js middleware).
composer.use(async (ctx, next) => {
  if (ctx.update.my_chat_member) {
    if (ctx.update.my_chat_member.chat.id === ctx.update.my_chat_member.from.id) {
      const status = ctx.update.my_chat_member.new_chat_member.status
      await ctx.db.User.updateOne(
        { telegram_id: ctx.update.my_chat_member.from.id },
        { $set: { status } }
      ).catch((err) => console.warn('[chat-member] User.updateOne failed:', err && err.message))
    }
  } else return next()
})

module.exports = composer

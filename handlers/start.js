const { isNewUser, startOnboarding } = require('./onboarding')
const { showMainMenu } = require('./menu')

module.exports = async ctx => {
  const getMe = await ctx.telegram.getMe()

  // Handle deep link for help
  if (ctx.startPayload === 'help') {
    const handleHelp = require('./help')
    return handleHelp(ctx)
  }

  // For private chats: show onboarding for new users, menu for returning users
  if (ctx.chat.type === 'private') {
    if (isNewUser(ctx)) {
      return startOnboarding(ctx)
    }
    return showMainMenu(ctx, getMe)
  }

  // For groups: show brief help with link
  await ctx.replyWithHTML(ctx.i18n.t('help_group', {
    username: getMe.username
  }), {
    disable_web_page_preview: true,
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true
  })
}

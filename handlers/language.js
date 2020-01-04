const Markup = require('telegraf/markup')
const handleHelp = require('./help')

module.exports = async (ctx) => {
  const locales = {
    en: '🇺🇸',
    ru: '🇷🇺',
    uk: '🇺🇦'
  }

  if (ctx.updateType === 'callback_query') {
    if (locales[ctx.match[1]]) {
      if (['supergroup', 'group'].includes(ctx.chat.type)) {
        const chatMember = await ctx.tg.getChatMember(
          ctx.callbackQuery.message.chat.id,
          ctx.callbackQuery.from.id
        )

        if (chatMember && ['creator', 'administrator'].includes(chatMember.status)) {
          ctx.answerCbQuery(locales[ctx.match[1]])
          ctx.group.info.settings.locale = ctx.match[1]
          ctx.i18n.locale(ctx.match[1])
          await handleHelp(ctx)
        } else {
          ctx.answerCbQuery()
        }
      } else {
        ctx.answerCbQuery(locales[ctx.match[1]])

        ctx.session.userInfo.settings.locale = ctx.match[1]
        ctx.i18n.locale(ctx.match[1])
        await handleHelp(ctx)
      }
    }
  } else {
    const button = []

    Object.keys(locales).map((key) => {
      button.push(Markup.callbackButton(locales[key], `set_language:${key}`))
    })

    ctx.reply('🇷🇺 Выберите язык\n🇺🇸 Choose language', {
      reply_markup: Markup.inlineKeyboard(button, {
        columns: 5
      })
    })
  }
}

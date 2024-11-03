const { Composer } = require('grammy')
const path = require('path')
const { I18n } = require('@grammyjs/i18n') // Fixed import
const handleHelp = require('./help')

const i18n = new I18n({
  directory: path.resolve(__dirname, '../locales'),
  defaultLanguage: 'en',
  useSession: true,
})

module.exports = async ctx => {
  const localseFile = fs.readdirSync('./locales/')
  const locales = {}

  localseFile.forEach((fileName) => {
    const localName = fileName.split('.')[0]
    locales[localName] = {
      flag: i18n.t(localName, 'language_name')
    }
  })

  if (ctx.callbackQuery) {
    if (locales[ctx.match[1]]) {
      if (['supergroup', 'group'].includes(ctx.chat.type)) {
        const chatMember = await ctx.getChatMember(ctx.callbackQuery.from.id)

        if (chatMember && ['creator', 'administrator'].includes(chatMember.status)) {
          ctx.answerCallbackQuery(locales[ctx.match[1]].flag)
          ctx.group.info.settings.locale = ctx.match[1]
          ctx.i18n.locale(ctx.match[1])
          await handleHelp(ctx)
        }
      } else {
        ctx.answerCallbackQuery(locales[ctx.match[1]].flag)
        ctx.session.userInfo.settings.locale = ctx.match[1]
        ctx.i18n.locale(ctx.match[1])
        await handleHelp(ctx)
      }
    }
  } else {
    const keyboard = new InlineKeyboard()

    Object.keys(locales).forEach((key, index) => {
      if (index % 2 === 0) keyboard.row()
      keyboard.text(locales[key].flag, `set_language:${key}`)
    })

    ctx.reply('🇺🇸 Choose language\n\nHelp with translation: https://crwd.in/QuotLyBot', {
      reply_markup: keyboard
    })
  }
}

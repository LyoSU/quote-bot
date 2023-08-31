const fs = require('fs')
const path = require('path')
const Markup = require('telegraf/markup')
const I18n = require('telegraf-i18n')
const handleHelp = require('./help')

const i18n = new I18n({
  directory: path.resolve(__dirname, '../locales'),
  defaultLanguage: 'en',
  defaultLanguageOnMissing: true
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

  if (ctx.updateType === 'callback_query') {
    if (locales[ctx.match[1]]) {
      if (['supergroup', 'group'].includes(ctx.chat.type)) {
        const chatMember = await ctx.tg.getChatMember(
          ctx.callbackQuery.message.chat.id,
          ctx.callbackQuery.from.id
        )

        if (chatMember && ['creator', 'administrator'].includes(chatMember.status)) {
          ctx.state.answerCbQuery = [locales[ctx.match[1]].flag]
          ctx.group.info.settings.locale = ctx.match[1]
          ctx.i18n.locale(ctx.match[1])
          await handleHelp(ctx)
        }
      } else {
        ctx.state.answerCbQuery = [locales[ctx.match[1]].flag]

        ctx.session.userInfo.settings.locale = ctx.match[1]
        ctx.i18n.locale(ctx.match[1])
        await handleHelp(ctx)
      }
    }
  } else {
    const button = []

    Object.keys(locales).map((key) => {
      button.push(Markup.callbackButton(locales[key].flag, `set_language:${key}`))
    })

    ctx.reply('🇺🇸 Choose language\n\nHelp with translation: https://crwd.in/QuotLyBot', {
      reply_markup: Markup.inlineKeyboard(button, {
        columns: 2
      })
    })
  }
}

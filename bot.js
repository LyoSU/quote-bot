const path = require('path')
const Telegraf = require('telegraf')
const I18n = require('telegraf-i18n')

const {
  handleHelp,
  handleQuote
} = require('./handlers')

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: {
    webhookReply: false
  }
})

const i18n = new I18n({
  directory: path.resolve(__dirname, 'locales'),
  defaultLanguage: 'ru',
  defaultLanguageOnMissing: true
})

bot.use(i18n.middleware())

bot.use(async (ctx, next) => {
  ctx.ms = new Date()
  next()
})

bot.use(async (ctx, next) => {
  await next(ctx)

  const ms = new Date() - ctx.ms
  console.log('Response time %sms', ms)
})

bot.hears(/^(\/qd|\/q)(?:(?:(?:\s(\d+))?\s(?:(#?))([^\s]+))?)/, handleQuote)

bot.on('new_chat_members', (ctx) => {
  if (ctx.message.new_chat_member.id, ctx.botInfo.id) handleHelp(ctx)
})

bot.start(handleHelp)
bot.command('help', handleHelp)

if (process.env.BOT_DOMAIN) {
  bot.launch({
    webhook: {
      domain: process.env.BOT_DOMAIN,
      hookPath: `/QuoteBot:${process.env.BOT_TOKEN}`,
      port: process.env.WEBHOOK_PORT || 2200
    }
  }).then(() => {
    console.log('bot start webhook')
  })
} else {
  bot.launch().then(() => {
    console.log('bot start polling')
  })
}

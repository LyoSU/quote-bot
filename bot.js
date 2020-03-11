const path = require('path')
const Telegraf = require('telegraf')
const session = require('telegraf/session')
const rateLimit = require('telegraf-ratelimit')
const I18n = require('telegraf-i18n')

const {
  db
} = require('./database')
const {
  stats,
  onlyGroup,
  onlyAdmin
} = require('./middlewares')
const {
  handleHelp,
  handleQuote,
  handleGetQuote,
  handleTopQuote,
  handleRandomQuote,
  handleColorQuote,
  handleSave,
  handleDelete,
  handleRate,
  handleSettingsRate,
  handleLanguage,
  handleFstik
} = require('./handlers')
const {
  updateUser,
  updateGroup
} = require('./helpers')

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: {
    webhookReply: false
  }
})

bot.on(['channel_post', 'edited_channel_post'], () => {})

bot.catch((error) => {
  console.log('Oops', error)
})

bot.use(stats)

bot.context.db = db

const i18n = new I18n({
  directory: path.resolve(__dirname, 'locales'),
  defaultLanguage: 'ru',
  defaultLanguageOnMissing: true
})

bot.use(i18n.middleware())

bot.use(rateLimit({
  window: 1000,
  limit: 1
}))

bot.use(session({ ttl: 60 * 5 }))
bot.use(session({
  property: 'group',
  getSessionKey: (ctx) => {
    if (ctx.from && ctx.chat && ['supergroup', 'group'].includes(ctx.chat.type)) {
      return `${ctx.chat.id}`
    }
    return null
  },
  ttl: 60 * 5
}))

bot.use(async (ctx, next) => {
  ctx.session.userInfo = await updateUser(ctx)
  if (ctx.session.userInfo.settings.locale) ctx.i18n.locale(ctx.session.userInfo.settings.locale)

  if (ctx.group) {
    ctx.group.info = await updateGroup(ctx)
    if (ctx.group.info.settings.locale) ctx.i18n.locale(ctx.group.info.settings.locale)
  }
  await next(ctx)

  await ctx.session.userInfo.save()
  if (ctx.group && ctx.group.info) {
    await ctx.group.info.save()
  }
})

bot.command('qtop', onlyGroup, handleTopQuote)
bot.command('qrand', onlyGroup, rateLimit({
  window: 1000 * 60,
  limit: 2,
  keyGenerator: (ctx) => {
    return ctx.chat.id
  },
  onLimitExceeded: ({ deleteMessage }) => deleteMessage().catch(() => {})
}), handleRandomQuote)
bot.command('q', handleQuote)
bot.hears(/\/q_(.*)/, handleGetQuote)
bot.hears(/^\/qs(?:\s([^\s]+)|)/, handleFstik)
bot.hears(/^\/qs(?:\s([^\s]+)|)/, onlyGroup, onlyAdmin, handleSave)
bot.command('qd', onlyGroup, onlyAdmin, handleDelete)
bot.hears(/^\/qcolor(?:(?:\s(?:(#?))([^\s]+))?)/, onlyAdmin, handleColorQuote)

bot.hears(/^!qrate/, onlyGroup, onlyAdmin, handleSettingsRate)
bot.action(/^(rate):(👍|👎)/, handleRate)

bot.on('new_chat_members', (ctx) => {
  if (ctx.message.new_chat_member.id === ctx.botInfo.id) handleHelp(ctx)
})

bot.start(handleHelp)
bot.command('help', handleHelp)

bot.command('lang', handleLanguage)
bot.action(/set_language:(.*)/, handleLanguage)

bot.on('message', (ctx, next) => {
  if (ctx.chat.type === 'private') setTimeout(() => handleQuote(ctx, next), 100)
  else return next()
})

db.connection.once('open', async () => {
  console.log('Connected to MongoDB')

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
})

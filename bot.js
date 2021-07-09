const fs = require('fs')
const path = require('path')
const Telegraf = require('telegraf')
const Composer = require('telegraf/composer')
const session = require('telegraf/session')
const rateLimit = require('telegraf-ratelimit')
const I18n = require('telegraf-i18n')
const io = require('@pm2/io')
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
  handleAdv,
  handleModerateAdv,
  handleQuote,
  handleGetQuote,
  handleTopQuote,
  handleRandomQuote,
  handleColorQuote,
  handleSettingsHidden,
  handleGabHidden,
  handleSave,
  handleDelete,
  handleRate,
  handleEmoji,
  handleSettingsRate,
  handlePrivacy,
  handleLanguage,
  handleFstik,
  handleDonate,
  handlePing,
  handleChatMember
} = require('./handlers')
const {
  getUser,
  getGroup
} = require('./helpers')

const rpsIO = io.meter({
  name: 'req/sec',
  unit: 'update'
})

const messageCountIO = io.meter({
  name: 'message count',
  unit: 'message'
})

const randomInteger = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: { webhookReply: false },
  handlerTimeout: 1
})

;(async () => {
  console.log(await bot.telegram.getMe())
})()

bot.use((ctx, next) => {
  next().catch((error) => {
    console.log('Oops', error)
  })
  return true
})

// bot.use(require('./middlewares/metrics'))
bot.use(stats)

bot.use((ctx, next) => {
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
  ctx.config = config
  return next()
})

bot.use((ctx, next) => {
  rpsIO.mark()
  ctx.telegram.oCallApi = ctx.telegram.callApi
  ctx.telegram.callApi = (method, data = {}) => {
    // console.log(`send method ${method}`)
    const startMs = new Date()
    return ctx.telegram.oCallApi(method, data).then((result) => {
      console.log(`end method ${method}:`, new Date() - startMs)
      return result
    })
  }

  // if (ctx.update.message) {
  //   const dif = Math.round(new Date().getTime() / 1000) - ctx.update.message.date

  //   if (dif > 2) console.log('🚨 delay ', dif)
  // }

  return next()
})

bot.command('json', ({ replyWithHTML, message }) => replyWithHTML('<code>' + JSON.stringify(message, null, 2) + '</code>'))

bot.use((ctx, next) => {
  ctx.db = db
  return next()
})

bot.use(handleChatMember)

bot.use(Composer.groupChat(Composer.command(rateLimit({
  window: 1000 * 5,
  limit: 2,
  keyGenerator: (ctx) => ctx.chat.id,
  onLimitExceeded: ({ deleteMessage }) => deleteMessage().catch(() => {})
}))))

bot.use(Composer.mount('callback_query', rateLimit({
  window: 2000,
  limit: 1,
  keyGenerator: (ctx) => ctx.from.id,
  onLimitExceeded: ({ answerCbQuery }) => answerCbQuery('too fast', true)
})))

bot.on(['channel_post', 'edited_channel_post'], () => {})

const i18n = new I18n({
  directory: path.resolve(__dirname, 'locales'),
  defaultLanguage: '-'
})

bot.use(i18n.middleware())

bot.use(session())

bot.use(async (ctx, next) => {
  ctx.state.emptyRequest = false
  return next().then(() => {
    if (ctx.state.emptyRequest === false) messageCountIO.mark()
  })
})

bot.use(Composer.groupChat(session({
  property: 'group',
  getSessionKey: (ctx) => {
    if (ctx.from && ctx.chat && ['supergroup', 'group'].includes(ctx.chat.type)) {
      return `${ctx.chat.id}`
    }
    return null
  },
  ttl: 60 * 5
})))

const updateGroupAndUser = async (ctx, next) => {
  await getUser(ctx)
  await getGroup(ctx)
  return next(ctx).then(async () => {
    if (ctx.state.emptyRequest === false) {
      ctx.session.userInfo.save().catch(() => {})
      const memberCount = await ctx.telegram.getChatMembersCount(ctx.chat.id)
      if (memberCount) ctx.group.info.memberCount = memberCount
      await ctx.group.info.save().catch(() => {})
    }
  })
}

bot.use(async (ctx, next) => {
  if (ctx.callbackQuery) {
    await getUser(ctx)
    ctx.state.answerCbQuery = []
  }
  return next(ctx).then(() => {
    if (ctx.callbackQuery) return ctx.answerCbQuery(...ctx.state.answerCbQuery)
  })
})

bot.use(Composer.groupChat(Composer.command(updateGroupAndUser)))

bot.use(Composer.privateChat(async (ctx, next) => {
  await getUser(ctx)
  await next(ctx).then(() => {
    ctx.session.userInfo.save().catch(() => {})
  })
}))

bot.on('message', Composer.privateChat((ctx, next) => {
  if (ctx.i18n.languageCode === '-') return handleLanguage(ctx, next)
  return next()
}))

bot.command('donate', handleDonate)
bot.command('ping', handlePing)
bot.action(/(donate):(.*)/, handleDonate)
bot.on('pre_checkout_query', ({ answerPreCheckoutQuery }) => answerPreCheckoutQuery(true))
bot.on('successful_payment', handleDonate)

bot.command('qtop', onlyGroup, handleTopQuote)
bot.command('qrand', onlyGroup, rateLimit({
  window: 1000 * 50,
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
bot.hears(/^\/(hidden)/, onlyAdmin, handleSettingsHidden)
bot.command('emoji', onlyAdmin, handleEmoji)
bot.hears(/^\/(gab) (\d+)/, onlyAdmin, handleGabHidden)
bot.hears(/^\/(qrate)/, onlyGroup, onlyAdmin, handleSettingsRate)
bot.action(/^(rate):(👍|👎)/, handleRate)

bot.on('new_chat_members', (ctx, next) => {
  if (ctx.message.new_chat_member.id === ctx.botInfo.id) return handleHelp(ctx)
  else return next()
})

bot.start(handleHelp)
bot.command('help', handleHelp)
bot.use(handleAdv)
bot.use(handleModerateAdv)

bot.command('privacy', onlyAdmin, handlePrivacy)

bot.command('lang', handleLanguage)
bot.action(/set_language:(.*)/, handleLanguage)

bot.on('message', Composer.privateChat(rateLimit({
  window: 700,
  limit: 1
}), handleQuote))

bot.on('message', rateLimit({
  window: 1000 * 5,
  limit: 1,
  keyGenerator: (ctx) => ctx.chat.id,
  onLimitExceeded: (ctx, next) => {
    ctx.state.skip = true
    return next()
  }
}), async (ctx, next) => {
  if (ctx.state.skip) return next()
  await getGroup(ctx)
  const gab = ctx.group.info.settings.randomQuoteGab

  if (gab > 0) {
    if (randomInteger(0, gab) === gab && (ctx.group.info.lastRandomQuote.getTime() / 1000) < Date.now() / 1000 - 60) {
      ctx.group.info.lastRandomQuote = Date()
      return handleRandomQuote(ctx)
    }
  }
  return next()
})

bot.use((ctx, next) => {
  ctx.state.emptyRequest = true
  return next()
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
    // const updates = await bot.telegram.callApi('getUpdates', { offset: -1 })
    // const offset = updates.length && updates[0].update_id + 1
    // if (offset) {
    //   await bot.telegram.callApi('getUpdates', { offset })
    // }
    await bot.launch().then(() => {
      console.log('bot start polling')
    })
  }
})

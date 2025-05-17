const fs = require('fs')
const path = require('path')
const Composer = require('telegraf/composer')
const session = require('telegraf/session')
const rateLimit = require('telegraf-ratelimit')
const I18n = require('telegraf-i18n')
const { onlyGroup, onlyAdmin } = require('./middlewares')
const {
  handleStart,
  handleHelp,
  handleAdv,
  handleModerateAdv,
  handleQuote,
  handleGetQuote,
  handleTopQuote,
  handleRandomQuote,
  handleColorQuote,
  handleEmojiBrandQuote,
  handleSettingsHidden,
  handleGabSettings,
  handleSave,
  handleDelete,
  handleRate,
  handleEmoji,
  handleSettingsRate,
  handlePrivacy,
  handleLanguage,
  handleFstik,
  handleSticker,
  handleDonate,
  handlePing,
  handleChatMember,
  handleInlineQuery,
  handleDeleteRandom
} = require('./handlers')
const { getUser, getGroup } = require('./helpers')

const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const bot = new Composer();

// bot.use(require('./middlewares/metrics'))

bot.command('json', ({ replyWithHTML, message }) =>
  replyWithHTML('<code>' + JSON.stringify(message, null, 2) + '</code>')
)

bot.use(handleChatMember)

bot.use(
  Composer.mount(
    'callback_query',
    rateLimit({
      window: 2000,
      limit: 1,
      keyGenerator: (ctx) => ctx.from.id
    })
  )
)

bot.on(['channel_post', 'edited_channel_post'], () => {})

const i18n = new I18n({
  directory: path.resolve(__dirname, 'locales'),
  defaultLanguage: 'en',
  defaultLanguageOnMissing: true,
})

bot.use(i18n.middleware())

bot.use(session({
  getSessionKey: (ctx) => {
    if (ctx.from && ctx.chat) return `${ctx.from.id}:${ctx.chat.id}`;
    if (ctx.from) return `user:${ctx.from.id}`;
    if (ctx.update?.business_message) return `user:${ctx.update.business_message.from.id}`;
    return null;
  },
  ttl: 3600
}));

bot.use(async (ctx, next) => {
  ctx.state.emptyRequest = false
  return next()
})

bot.use(
  Composer.groupChat(
    session({
      property: 'group',
      getSessionKey: (ctx) => {
        if (
          ctx.from &&
          ctx.chat &&
          ['supergroup', 'group'].includes(ctx.chat.type)
        ) {
          return `${ctx.chat.id}`
        }
        return null
      },
      ttl: 60 * 5
    })
  )
)

const updateGroupAndUser = async (ctx, next) => {
  await Promise.all([getUser(ctx), getGroup(ctx)]);
  await next(ctx);
  if (ctx.state.emptyRequest === false) {
    await Promise.all([
      ctx.session.userInfo.save().catch(() => {}),
      ctx.group.info.save().catch(() => {})
    ]);
  }
};

bot.use(async (ctx, next) => {
  if (ctx.inlineQuery) {
    await getUser(ctx)
    ctx.state.answerIQ = []
  }
  if (ctx.callbackQuery) {
    await getUser(ctx)
    ctx.state.answerCbQuery = []
  }

  return next(ctx).then(() => {
    if (ctx.inlineQuery) return ctx.answerInlineQuery(...ctx.state.answerIQ).catch(() => { })
    if (ctx.callbackQuery) return ctx.answerCbQuery(...ctx.state.answerCbQuery).catch(() => { })
  })
})

bot.use(Composer.groupChat(Composer.command(updateGroupAndUser)))

bot.use(
  Composer.privateChat(async (ctx, next) => {
    await getUser(ctx)
    await next(ctx).then(() => {
      ctx.session.userInfo.save().catch(() => {})
    })
  })
)

bot.start(async (ctx, next) => {
  const arg = ctx.message.text.split(' ')
  if (arg[1] && ctx.config.logChatId) {
    await ctx.tg.sendMessage(
      ctx.config.logChatId,
      `#${arg[1]}\n<code>${JSON.stringify(ctx.message, null, 2)}</code>`,
      {
        parse_mode: 'HTML'
      }
    )
  }
  return next()
})

bot.hears(/\/q(.*)\*(.*)/, rateLimit({
  window: 1000 * 25,
  limit: 1,
  keyGenerator: (ctx) => ctx.from.id,
  onLimitExceeded: (ctx) => {
    return ctx.replyWithHTML(ctx.i18n.t('rate_limit', {
      seconds: 25
    }), {
      reply_to_message_id: ctx.message.message_id
    }).then((msg) => {
      setTimeout(() => {
        ctx.deleteMessage().catch(() => {})
        ctx.deleteMessage(msg.message_id).catch(() => {})
      }, 5000)
    })
  }
}))

bot.command('donate', handleDonate)
bot.command('ping', handlePing)
bot.action(/(donate):(.*)/, handleDonate)
bot.on('pre_checkout_query', ({ answerPreCheckoutQuery }) =>
  answerPreCheckoutQuery(true)
)
bot.on('successful_payment', handleDonate)
bot.hears(/\/refund (.*)/, async (ctx) => {
  if (ctx.config.adminId !== ctx.from.id) return

  const [_, paymentId] = ctx.match

  const userId = paymentId.match(/U(\d+)/)[1]

  try {
    await ctx.telegram.callApi('refundStarPayment', {
      user_id: userId,
      telegram_payment_charge_id: paymentId
    })

    await ctx.replyWithHTML(`Refund success: ${userId} ${paymentId}`)
  } catch (error) {
    await ctx.replyWithHTML(`Refund error: ${error.description}`)
  }
})

bot.command('qtop', onlyGroup, handleTopQuote)
bot.command(
  'qrand',
  onlyGroup,
  rateLimit({
    window: 1000 * 50,
    limit: 2,
    keyGenerator: (ctx) => {
      return ctx.chat.id
    },
    onLimitExceeded: ({ deleteMessage }) => deleteMessage().catch(() => {})
  }),
  handleRandomQuote
)

// business_message
bot.use((ctx, next) => {
  if (!ctx.update?.business_message) {
    return next()
  }

  if (ctx.update.business_message.text) {
    ctx.update.message = ctx.update.business_message

    if (ctx.update.business_message.text.startsWith('/q')) {
      ctx.update.message.text = ctx.update.business_message.text

      return handleQuote(ctx, next)
    }
  }
  return next()
})

bot.command('q', handleQuote)
bot.hears(/\/q_(.*)/, handleGetQuote)
bot.hears(/^\/qs(?:\s([^\s]+)|)/, handleFstik)
bot.hears(/^\/qs(?:\s([^\s]+)|)/, onlyGroup, onlyAdmin, handleSave)
bot.command('qd', onlyGroup, onlyAdmin, handleDelete)
bot.command('qdrand', onlyGroup, onlyAdmin, handleDeleteRandom)
bot.hears(/^\/qcolor(?:(?:\s(?:(#?))([^\s]+))?)/, onlyAdmin, handleColorQuote)
bot.command('qb', onlyAdmin, handleEmojiBrandQuote)
bot.hears(/^\/(hidden)/, onlyAdmin, handleSettingsHidden)
bot.command('qemoji', onlyAdmin, handleEmoji)
bot.hears(/^\/(qgab) (\d+)/, onlyGroup, onlyAdmin, handleGabSettings)
bot.hears(/^\/(qrate)/, onlyGroup, onlyAdmin, handleSettingsRate)
bot.action(/^(rate):(👍|👎)/, handleRate)
bot.action(/^(irate):(.*):(👍|👎)/, handleRate)

// bot.on('new_chat_members', (ctx, next) => {
//   if (ctx.message.new_chat_member.id === ctx.botInfo.id) return handleHelp(ctx)
//   else return next()
// })

bot.start(handleStart)
bot.command('help', handleHelp)
bot.use(handleAdv)

bot.use(handleModerateAdv)

bot.use(handleInlineQuery)

bot.command('privacy', onlyAdmin, handlePrivacy)

bot.command('lang', handleLanguage)
bot.action(/set_language:(.*)/, handleLanguage)

// bot.on('sticker', rateLimit({
//   window: 1000 * 60,
//   limit: 1,
//   keyGenerator: (ctx) => ctx.from.id,
//   onLimitExceeded: (ctx, next) => {
//     return next()
//   }
// }), handleSticker)
// bot.on('text', rateLimit({
//   window: 1000 * 60,
//   limit: 1,
//   keyGenerator: (ctx) => ctx.from.id,
//   onLimitExceeded: (ctx, next) => {
//     return next()
//   }
// }), handleSticker)

bot.on('message', Composer.privateChat(handleQuote))

bot.on(
  'message',
  Composer.groupChat(
    rateLimit({
      window: 1000 * 5,
      limit: 1,
      keyGenerator: (ctx) => ctx.chat.id,
      onLimitExceeded: (ctx, next) => {
        ctx.state.skip = true
        return next()
      }
    }),
    async (ctx, next) => {
      if (ctx.state.skip) return next()
      await getGroup(ctx)
      const gab = ctx.group.info.settings.randomQuoteGab

      if (gab > 0) {
        const random = randomIntegerInRange(1, gab)
        if (
          random === gab &&
          ctx.group.info.lastRandomQuote.getTime() / 1000 <
            Date.now() / 1000 - 60
        ) {
          ctx.group.info.lastRandomQuote = Date()
          ctx.state.randomQuote = true
          return handleRandomQuote(ctx)
        }
      }
      return next()
    }
  )
)

bot.use((ctx, next) => {
  ctx.state.emptyRequest = true
  return next()
})

module.exports = bot

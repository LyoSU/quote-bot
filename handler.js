const { Composer } = require('grammy')  // Remove session import
const { conversations } = require('@grammyjs/conversations')
const path = require('path')
const { onlyGroup, onlyAdmin } = require('./middlewares')
const { rateLimit } = require('./middlewares/rateLimit')
const {
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

const composer = new Composer()

// Remove session initialization from handler.js

// Keep the conversations middleware
composer.use(conversations())

composer.command('json', ({ replyWithHTML, message }) =>
  replyWithHTML('<code>' + JSON.stringify(message, null, 2) + '</code>')
)

composer.use(handleChatMember)

// Rate limiter middleware
composer.use(rateLimit({
  window: 1000,
  limit: 3,
  keyGenerator: (ctx) => ctx.from?.id,
  onLimitExceeded: async (ctx) => {
    await ctx.reply('Too many requests, please slow down')
  }
}))

// Replace Composer.mount with .on('callback_query')
composer.on('callback_query',
  rateLimit({
    window: 1000,
    limit: 3,
    keyGenerator: (ctx) => ctx.from?.id,
    onLimitExceeded: async (ctx) => {
      await ctx.reply('Too many requests, please slow down')
    }
  })
)

composer.on(['channel_post', 'edited_channel_post'], () => {})

// Helper function to filter group chats
const groupChat = (middleware) => {
  return async (ctx, next) => {
    if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
      return middleware(ctx, next)
    }
    return next()
  }
}

// Remove the session middleware for groups and replace with direct group chat filter
composer.use(
  groupChat(async (ctx, next) => {
    if (
      ctx.from &&
      ctx.chat &&
      ['supergroup', 'group'].includes(ctx.chat.type)
    ) {
      // Initialize group session data if needed
      ctx.session.group = ctx.session.group || {}
      return next()
    }
    return next()
  })
)

const updateGroupAndUser = async (ctx, next) => {
  try {
    if (!ctx.session) return next()

    await Promise.all([getUser(ctx), getGroup(ctx)])
    await next()

    if (!ctx.state.emptyRequest) {
      await Promise.all([
        ctx.session?.userInfo?.save?.()?.catch(() => {}),
        ctx.group?.info?.save?.()?.catch(() => {})
      ])
    }
  } catch (error) {
    console.error('Error in updateGroupAndUser:', error)
    await next()
  }
}

composer.use(async (ctx, next) => {
  if (ctx.inlineQuery || ctx.callbackQuery) {
    ctx.state = {
      ...ctx.state,
      answerIQ: ctx.inlineQuery ? [] : undefined,
      answerCbQuery: ctx.callbackQuery ? [] : undefined
    }
  }

  try {
    await next()

    if (ctx.inlineQuery && ctx.state.answerIQ?.length) {
      await ctx.answerInlineQuery(...ctx.state.answerIQ).catch(() => {})
    }
    if (ctx.callbackQuery && ctx.state.answerCbQuery?.length) {
      await ctx.answerCbQuery(...ctx.state.answerCbQuery).catch(() => {})
    }
  } catch (error) {
    console.error('Error in middleware:', error)
  }
})

// Update this section
composer.use(groupChat(async (ctx, next) => {
  if (ctx.message?.entities?.[0]?.type === 'bot_command') {
    await updateGroupAndUser(ctx, next)
  } else {
    return next()
  }
}))

// Replace Composer.privateChat with filter
const privateChat = (middleware) => {
  return async (ctx, next) => {
    if (ctx.chat?.type === 'private') {
      return middleware(ctx, next)
    }
    return next()
  }
}

composer.use(
  privateChat(async (ctx, next) => {
    if (!ctx.session) {
      ctx.session = {
        locale: ctx.from?.language_code || 'en',
        userInfo: {},
        group: {},
        __language_code: ctx.from?.language_code || 'en'
      }
    }

    try {
      // Ensure i18n is available
      if (!ctx.i18n) {
        console.error('i18n not available in context')
        return next()
      }

      await getUser(ctx)
      await next()
      await ctx.session?.userInfo?.save?.()?.catch(() => {})
    } catch (error) {
      console.error('Error in private chat handler:', error)
      return next()
    }
  })
)

composer.command('start', async (ctx, next) => {
  const arg = ctx.message.text.split(' ')
  if (arg[1] && ctx.config.logChatId) {
    await ctx.api.sendMessage(
      ctx.config.logChatId,
      `#${arg[1]}\n<code>${JSON.stringify(ctx.message, null, 2)}</code>`,
      {
        parse_mode: 'HTML'
      }
    )
  }
  // Handle start command with help handler
  await handleHelp(ctx, next)
})

composer.hears(/\/q(.*)\*(.*)/, rateLimit({
  window: 1000,
  limit: 3,
  keyGenerator: (ctx) => ctx.from?.id,
  onLimitExceeded: async (ctx) => {
    await ctx.replyWithHTML(ctx.i18n.t('rate_limit', {
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

composer.command('donate', handleDonate)
composer.command('ping', handlePing)
composer.callbackQuery(/(donate):(.*)/, handleDonate)

// Replace these payment handlers with the correct grammY syntax
composer.on('pre_checkout_query', (ctx) => {
  return ctx.answerPreCheckoutQuery(true)
})

// Use message.successful_payment filter instead
composer.on('message', (ctx, next) => {
  if (ctx.message?.successful_payment) {
    return handleDonate(ctx)
  }

  return next()
})

composer.hears(/\/refund (.*)/, async (ctx) => {
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

composer.command('qtop', onlyGroup, handleTopQuote)
composer.command(
  'qrand',
  onlyGroup,
  rateLimit({
    window: 1000,
    limit: 3,
    keyGenerator: (ctx) => ctx.from?.id,
    onLimitExceeded: async (ctx) => {
      await ctx.reply('Too many requests, please slow down')
    }
  }),
  handleRandomQuote
)

// business_message
composer.use((ctx, next) => {
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

composer.command('q', handleQuote)
composer.hears(/\/q_(.*)/, handleGetQuote)
composer.hears(/^\/qs(?:\s([^\s]+)|)/, handleFstik)
composer.hears(/^\/qs(?:\s([^\s]+)|)/, onlyGroup, onlyAdmin, handleSave)
composer.command('qd', onlyGroup, onlyAdmin, handleDelete)
composer.command('qdrand', onlyGroup, onlyAdmin, handleDeleteRandom)
composer.hears(/^\/qcolor(?:(?:\s(?:(#?))([^\s]+))?)/, onlyAdmin, handleColorQuote)
composer.command('qb', onlyAdmin, handleEmojiBrandQuote)
composer.hears(/^\/(hidden)/, onlyAdmin, handleSettingsHidden)
composer.command('qemoji', onlyAdmin, handleEmoji)
composer.hears(/^\/(qgab) (\d+)/, onlyGroup, onlyAdmin, handleGabSettings)
composer.hears(/^\/(qrate)/, onlyGroup, onlyAdmin, handleSettingsRate)
composer.callbackQuery(/^(rate):(👍|👎)/, handleRate)  // Changed from action to callbackQuery
composer.callbackQuery(/^(irate):(.*):(👍|👎)/, handleRate)  // Changed from action to callbackQuery

composer.command('help', handleHelp)
composer.use(handleAdv)

composer.use(handleModerateAdv)

composer.use(handleInlineQuery)

composer.command('privacy', onlyAdmin, handlePrivacy)

composer.command('lang', handleLanguage)
composer.callbackQuery(/set_language:(.*)/, handleLanguage)  // Changed from action to callbackQuery

// Replace direct sticker/text handlers with message filter
composer.on('message:sticker', rateLimit({
  window: 1000,
  limit: 3,
  keyGenerator: (ctx) => ctx.from?.id,
  onLimitExceeded: async (ctx) => {
    await ctx.reply('Too many requests, please slow down')
  }
}), handleSticker)

composer.on('message:text', rateLimit({
  window: 1000,
  limit: 3,
  keyGenerator: (ctx) => ctx.from?.id,
  onLimitExceeded: async (ctx) => {
    await ctx.reply('Too many requests, please slow down')
  }
}), handleSticker)

composer.on('message', privateChat(handleQuote))

composer.on(
  'message',
  groupChat(
    rateLimit({
      window: 1000,
      limit: 3,
      keyGenerator: (ctx) => ctx.from?.id,
      onLimitExceeded: async (ctx) => {
        await ctx.reply('Too many requests, please slow down')
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

composer.use((ctx, next) => {
  ctx.state.emptyRequest = true
  return next()
})

module.exports = composer

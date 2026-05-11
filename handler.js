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
  handleAiMode,
  handleFstik,
  handleSticker,
  handleDonate,
  handlePing,
  handleChatMember,
  handleInlineQuery,
  handleDeleteRandom,
  handleOnboardingCallback,
  handleMenuCallback,
  handleArchive,
  handleForget,
  handleApp
} = require('./handlers')
const { getUser, getGroup } = require('./helpers')
const guestMode = require('./helpers/guest-mode')

const randomIntegerInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const bot = new Composer();

// Populate ctx.botInfo for handlers that need bot username (e.g. deep-link
// builder). Workers run bot.handleUpdate directly without calling .launch(),
// so telegraf never populates botInfo itself. Cached per worker process.
let cachedBotInfo = null
bot.use(async (ctx, next) => {
  if (!ctx.botInfo) {
    if (!cachedBotInfo) {
      cachedBotInfo = await ctx.telegram.getMe().catch(() => null)
    }
    if (cachedBotInfo) ctx.botInfo = cachedBotInfo
  }
  return next()
})

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
    // Guest mode (Bot API 10.0): we never share session with the foreign chat;
    // pin to caller user only so a user using the bot guest-style in different
    // chats keeps consistent personal settings (language, color, etc.).
    const guest = ctx.update?.guest_message
    if (guest) {
      const callerId = guest.guest_bot_caller_user?.id || guest.from?.id
      if (callerId) return `guest:${callerId}`
      return null
    }
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

// Guest mode (Bot API 10.0) — early-route every guest_message into a dedicated
// branch so it bypasses the group/private session+getGroup machinery (the chat
// is foreign and creating a Group document for it would be incorrect).
//
// We intentionally short-circuit by NOT calling next() inside this block: the
// rest of the pipeline assumes the bot is a chat member and would otherwise
// try to write back via sendMessage, which is forbidden for guests.
bot.use(async (ctx, next) => {
  const gm = ctx.update?.guest_message
  if (!gm) return next()

  // No query_id ⇒ no way to reply, and the chat is foreign so we mustn't
  // fall through to ordinary handlers. Silently drop.
  if (!gm.guest_query_id) return

  // Mirror onto ctx.update.message so existing handlers (which look at
  // ctx.message) just work. The inbound guest_message carries the caller as
  // standard `from` and `chat` fields — `guest_bot_caller_*` are reserved
  // for OUTBOUND messages the bot sends via answerGuestQuery.
  //
  // We forcibly retag chat.type → 'private' because handleQuote uses chat.type
  // to decide between the "single message in DM" path and the "fetch history
  // around the reply" path. In a guest context we have NO history access
  // (we're not a chat member, TDLib can't read it either), so the DM-style
  // path is the only one that produces correct results.
  ctx.update.message = gm
  if (gm.chat) {
    ctx.update.message.chat = { ...gm.chat, type: 'private' }
  }
  ctx.state.guest = {
    queryId: gm.guest_query_id,
    callerUser: gm.from || null,
    callerChat: gm.chat || null,
    message: gm
  }

  // Install the reply proxy BEFORE we run any handler — quote.js calls
  // ctx.replyWithChatAction synchronously near the top, and we need that to
  // become a no-op rather than try to write to a chat we're not in.
  guestMode.wrapGuestProxy(ctx)

  // We need ctx.session.userInfo for /q to work (language, settings).
  // getUser tolerates missing chat — it keys off ctx.from.
  try {
    await getUser(ctx)
  } catch (err) {
    console.warn('[guest] getUser failed:', err && err.message)
  }

  const rawText = (gm.text || gm.caption || '').trim()
  const botUsername = (ctx.botInfo && ctx.botInfo.username) || ''

  // ---- Text normalisation for guest mentions ----
  //
  // Semantics requested by the bot owner:
  //   "@botname" acts as a direct alias for "/q" — anything to the RIGHT of
  //   the (last) @botname mention is parsed as /q arguments exactly like in
  //   a regular chat. Text to the LEFT of the mention is the user's own
  //   prose around the call and is ignored by the bot.
  //
  // Examples (botname = quotlybot):
  //   "@quotlybot"               + reply  → /q                (quote the reply)
  //   "@quotlybot r red"         + reply  → /q r red          (reply-flag + red bg)
  //   "look at this @quotlybot"  + reply  → /q                (extras before are noise)
  //   "/q@quotlybot rate"        + reply  → /q rate           (classic command form)
  //   "@quotlybot"               no reply → /q                (quote of *empty* — error article)
  //
  // We also keep the original /command form working (/q, /q@bot, /help, /start).
  let text = rawText

  // 1. Classic /q[@bot] command form takes precedence.
  const slashCmd = rawText.match(/^\/([a-zA-Z0-9_]+)(?:@([a-zA-Z0-9_]+))?(?:\s|$)/)
  if (slashCmd) {
    // Drop the @botname suffix from the command so handleQuote's tokenizer
    // sees just "/q args".
    if (slashCmd[2] && botUsername && slashCmd[2].toLowerCase() === botUsername.toLowerCase()) {
      text = rawText.replace(/^\/[a-zA-Z0-9_]+@[a-zA-Z0-9_]+/, `/${slashCmd[1]}`)
    } else {
      text = rawText
    }
  } else if (botUsername) {
    // 2. Pure @botname mention form — split on the LAST occurrence so prose
    // before the mention is dropped and args after it survive intact.
    const mentionRe = new RegExp(`@${botUsername}\\b`, 'gi')
    const matches = [...rawText.matchAll(mentionRe)]
    if (matches.length > 0) {
      const last = matches[matches.length - 1]
      const args = rawText.slice(last.index + last[0].length).trim()
      text = args ? `/q ${args}` : '/q'
    } else {
      // No mention and no /command — this is a reply to one of our previous
      // guest messages (Telegram still fires guest_message in that case).
      // Treat the bare text as quote source: dispatch /q with no args, the
      // handler will pick up reply_to_message or the message itself.
      text = '/q'
    }
  } else {
    text = rawText
  }

  // Detect command AFTER normalisation so whitelist routing is consistent.
  const commandMatch = text.match(/^\/([a-zA-Z0-9_]+)(?:\s|$)/)
  const command = commandMatch ? commandMatch[1].toLowerCase() : null

  ctx.update.message.text = text

  const tFromI18n = (key, vars) => {
    try { return ctx.i18n.t(key, vars) } catch (_) { return null }
  }

  try {
    if (command === 'q') {
      // Guest mode without reply_to_message is a degenerate case — there's no
      // foreign message we can quote (TDLib can't see this chat, the bot
      // isn't a member, and the caller's own message would just contain
      // "@bot args" with no useful content). Short-circuit with a help
      // article instead of letting handleQuote synthesize a "/q args" quote
      // of the call-text itself.
      if (!gm.reply_to_message) {
        const username = (ctx.botInfo && ctx.botInfo.username) || 'this_bot'
        return await guestMode.answerGuestArticle(
          ctx,
          tFromI18n('guest.need_reply', { username })
            || `<b>Reply to a message and mention me</b>\n\nIn guest mode I can only quote a message you reply to. Open <a href="https://t.me/${username}">@${username}</a> in PM for the full experience.`,
          {
            title: 'Quotly',
            description: tFromI18n('guest.need_reply_short') || 'Reply to a message',
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: tFromI18n('guest.open_in_pm') || `Open @${username}`, url: `https://t.me/${username}` }
              ]]
            }
          }
        )
      }
      return await handleQuote(ctx, () => Promise.resolve())
    }
    if (command === 'start' || command === 'help') {
      const username = (ctx.botInfo && ctx.botInfo.username) || 'this_bot'
      const body = tFromI18n('guest.hint', { username })
        || `<b>Quotly</b> in guest mode\n\nUse <code>/q</code> with text or in reply to a message to generate a sticker quote.\nFor full features open the bot in PM: @${username}`
      return await guestMode.answerGuestArticle(ctx, body, {
        title: 'Quotly',
        description: tFromI18n('guest.hint_short') || 'How to use /q',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: tFromI18n('guest.open_in_pm') || `Open @${username}`, url: `https://t.me/${username}` }
          ]]
        }
      })
    }

    // Unknown command after normalisation — guard for forward-compat in case
    // a future BotFather knob enables additional command-style invocations.
    const username = (ctx.botInfo && ctx.botInfo.username) || 'this_bot'
    return await guestMode.answerGuestArticle(
      ctx,
      tFromI18n('guest.empty_query', { username })
        || `<b>Quotly</b> — mention me in reply to a message to create a quote, or use <code>/q</code> with args.`,
      {
        title: 'Quotly',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: tFromI18n('guest.open_in_pm') || `Open @${username}`, url: `https://t.me/${username}` }
          ]]
        }
      }
    )
  } catch (err) {
    console.warn('[guest] handler failed:', err && err.stack || err)
    // Best-effort silent recovery — if we already answered the query, this
    // is a no-op; if we didn't, the slot expires server-side after ~30s.
    try {
      await guestMode.answerGuestArticle(ctx, '⚠️ Sorry, something went wrong.', { parse_mode: 'HTML' })
    } catch (_) { /* already-answered or expired */ }
  }
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

// Snapshot current Telegram profile state — written via targeted updateOne
// (not full-doc save) so concurrent workers handling parallel updates from
// the same user can't race into a VersionError.
const syncUserProfileFields = (ctx) => {
  if (!ctx.from || !ctx.session.userInfo || !ctx.session.userInfo._id) return null
  const $set = {
    first_name: ctx.from.first_name,
    last_name: ctx.from.last_name,
    full_name: `${ctx.from.first_name}${ctx.from.last_name ? ` ${ctx.from.last_name}` : ''}`,
    username: ctx.from.username,
    updatedAt: new Date()
  }
  if (ctx.chat && ctx.chat.type === 'private') $set.status = 'member'
  return ctx.db.User.updateOne({ _id: ctx.session.userInfo._id }, { $set }).catch((err) => {
    console.warn('[session] User.updateOne failed:', err && err.message)
  })
}

const updateGroupAndUser = async (ctx, next) => {
  await Promise.all([getUser(ctx), getGroup(ctx)]);
  await next(ctx);
  if (ctx.state.emptyRequest === false) {
    const savePromises = []
    const profileWrite = syncUserProfileFields(ctx)
    if (profileWrite) savePromises.push(profileWrite)

    // Group: settings/stickerSet may be mutated by handlers via in-memory writes.
    // unmarkModified('quoteCounter') keeps the atomic $inc in handlers/quote.js safe.
    if (ctx.group?.info?.isModified?.()) {
      // quoteCounter is owned by atomic $inc in handlers/quote.js — the in-memory
      // value on this doc can be stale (loaded from session or from before the
      // $inc). Strip it from the save so we never stomp the atomic counter.
      ctx.group.info.unmarkModified('quoteCounter')
      if (ctx.group.info.isModified()) {
        savePromises.push(ctx.group.info.save().catch((err) => {
          console.warn('[session] group.info.save failed:', err && err.message)
        }))
      }
    }
    if (savePromises.length > 0) {
      Promise.all(savePromises).catch(() => {})
    }
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
      const profileWrite = syncUserProfileFields(ctx)
      if (profileWrite) profileWrite.catch(() => {})
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
bot.command('qarchive', onlyGroup, onlyAdmin, handleArchive)
bot.command('qforget', onlyGroup, handleForget)
bot.command('app', handleApp)
bot.action(/^(rate):(👍|👎)/, handleRate)
bot.action(/^(irate):(.*):(👍|👎)/, handleRate)

// Onboarding & Menu callbacks
bot.action(/^onboarding:(.*)/, handleOnboardingCallback)
bot.action(/^menu:(.*)/, handleMenuCallback)

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

bot.use(handleAiMode)

// Sticker stats collection middleware (runs on all messages)
// Tracks sticker usage and custom emoji for fstikbot catalog
bot.use(handleSticker)

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
      if (!ctx.group || !ctx.group.info || !ctx.group.info.settings) {
        return next()
      }
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

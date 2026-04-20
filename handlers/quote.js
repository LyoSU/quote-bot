const Telegram = require('telegraf/telegram')
const fs = require('fs')
const {
  OpenAI
} = require('openai')
const slug = require('limax')
const EmojiDbLib = require('emoji-db')

const emojiDb = new EmojiDbLib({ useDefaultDb: true })
const emojiArray = Object.values(emojiDb.dbData).filter(data => {
  if (data.emoji) return true
})

const telegram = new Telegram(process.env.BOT_TOKEN)

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://quotlybot.t.me/",
    "X-Title": "Quotly Bot",
  }
})

const { sendGramadsAd } = require('../helpers/gramads')
const deepLink = require('../helpers/deep-link')
const denormalizeQuote = require('../utils/denormalize-quote')
const buildQuoteReplyMarkup = require('../utils/build-quote-reply-markup')
const persistQuoteArtifacts = require('../utils/persist-quote-artifacts')
const persistUserSetting = require('../helpers/persist-user-setting')

// Config will be loaded asynchronously through context
let config = null

// Initialize config asynchronously
const initConfig = async () => {
  try {
    const configData = await fs.promises.readFile('./config.json', 'utf8')
    config = JSON.parse(configData)
  } catch (error) {
    console.error('Error loading config in quote handler:', error)
    config = { globalStickerSet: { save_sticker_count: 10, name: 'default' } }
  }
}

initConfig()

let botInfo
let clearStickerPackTimer

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Cleans old stickers from the sticker pack periodically
async function startClearStickerPack(stickerConfig = null) {
  if (clearStickerPackTimer) return

  let isRunning = false

  clearStickerPackTimer = setInterval(async () => {
    // Prevent overlapping executions
    if (isRunning) {
      console.log('Sticker cleanup already running, skipping this cycle')
      return
    }

    isRunning = true
    try {
      if (!botInfo) botInfo = await telegram.getMe()

      const configToUse = stickerConfig || config || { globalStickerSet: { save_sticker_count: 10, name: 'default' } }

      // Add timeout to prevent hanging
      const stickerSet = await Promise.race([
        telegram.getStickerSet(configToUse.globalStickerSet.name + botInfo.username),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getStickerSet timeout')), 10000))
      ]).catch((error) => {
        console.log('clearStickerPack error:', error)
        return null
      })

      if (!stickerSet) return

      const stickersToDelete = stickerSet.stickers.slice(configToUse.globalStickerSet.save_sticker_count)

      // Limit concurrent deletions
      const maxConcurrent = 3
      for (let i = 0; i < stickersToDelete.length; i += maxConcurrent) {
        const batch = stickersToDelete.slice(i, i + maxConcurrent)
        await Promise.allSettled(
          batch.map(sticker =>
            Promise.race([
              telegram.deleteStickerFromSet(sticker.file_id),
              new Promise((_, reject) => setTimeout(() => reject(new Error('deleteStickerFromSet timeout')), 5000))
            ])
          )
        )
        // Add delay between batches
        if (i + maxConcurrent < stickersToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    } catch (error) {
      console.error('Sticker cleanup error:', error)
    } finally {
      isRunning = false
    }
  }, 10000) // Increased to 10 seconds

  // Add cleanup on process exit
  process.once('SIGTERM', () => {
    if (clearStickerPackTimer) {
      clearInterval(clearStickerPackTimer)
    }
  })
}

const hashCode = (s) => {
  const l = s.length
  let h = 0
  let i = 0
  if (l > 0) {
    while (i < l) {
      h = (h << 5) - h + s.charCodeAt(i++) | 0
    }
  }
  return h
}

// Look up a hidden-user forward by their displayed name in our DB and return
// a full sender object (id + tdlib/Bot-API enrichment). Called only when the
// user opted into `hidden` mode — otherwise we synthesize a stable pseudo-id
// from the name. Cached per-context to survive big forward batches.
const enrichHiddenUser = async (ctx, name) => {
  const cacheKey = `forward_${name}`
  if (!ctx.forwardCache) ctx.forwardCache = new Map()

  let matches
  if (ctx.forwardCache.has(cacheKey)) {
    matches = ctx.forwardCache.get(cacheKey)
  } else {
    matches = await ctx.db.User.find({ full_name: name }).limit(2).lean()
    ctx.forwardCache.set(cacheKey, matches)
  }

  if (matches.length !== 1) {
    return { id: hashCode(name), name }
  }

  const match = matches[0]
  const enriched = (await ctx.tdlib.getUser(match.telegram_id).catch(() => null))
    || (await ctx.tg.getChat(match.telegram_id).catch(console.error))
  return enriched || {
    id: match.telegram_id,
    name,
    username: match.username || null
  }
}

const stubFromName = (name) => ({ id: hashCode(name), name })

const senderFromChat = (sc) => ({
  id: sc.id,
  name: sc.title,
  username: sc.username || null,
  photo: sc.photo
})

// MessageOrigin → internal "sender" shape.
// Handles all four subtypes per Bot API spec (messageOriginUser /
// HiddenUser / Chat / Channel). `forward_origin` lives on forwarded messages;
// `origin` lives on ExternalReplyInfo — identical schema, different field
// name. Returns null if origin is missing or unrecognized so callers can
// fall through to legacy fields.
const resolveMessageOrigin = (origin) => {
  if (!origin) return null
  if (origin.type === 'user' && origin.sender_user) return origin.sender_user
  if (origin.type === 'hidden_user') {
    return {
      id: hashCode(origin.sender_user_name || ''),
      name: origin.sender_user_name
    }
  }
  if (origin.type === 'chat' && origin.sender_chat) {
    const from = { ...origin.sender_chat }
    if (origin.author_signature) from.author_signature = origin.author_signature
    return from
  }
  if (origin.type === 'channel' && origin.chat) {
    const from = { ...origin.chat }
    if (origin.author_signature) from.author_signature = origin.author_signature
    return from
  }
  return null
}

const generateRandomColor = () => {
  const rawColor = (Math.floor(Math.random() * 16777216)).toString(16)
  const color = '0'.repeat(6 - rawColor.length) + rawColor
  return `#${color}`
}

const minIdsInChat = {}
// Cleanup stale entries every 30 seconds
setInterval(() => {
  const now = Date.now()
  for (const key of Object.keys(minIdsInChat)) {
    if (minIdsInChat[key].ts && now - minIdsInChat[key].ts > 10000) {
      delete minIdsInChat[key]
    }
  }
}, 30000)

const handleQuoteError = async (ctx, error) => {
  console.error('Quote error:', error)

  // API rate limiting
  if (error.response && error.response.statusCode === 429) {
    return ctx.replyWithHTML(ctx.i18n.t('quote.errors.rate_limit', {
      seconds: 30
    }))
  }

  // Handle Telegram API specific errors
  if (error.description) {
    const errorDesc = error.description.toLowerCase()

    // Permission errors
    if (errorDesc.includes('not enough rights to send documents')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.no_rights_send_documents'))
    }

    if (errorDesc.includes('not enough rights to send stickers')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.no_rights_send_stickers'))
    }

    if (errorDesc.includes('not enough rights to send photos')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.no_rights_send_photos'))
    }

    // Chat access errors
    if (errorDesc.includes('chat write forbidden') || errorDesc.includes('forbidden')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.chat_write_forbidden'))
    }

    if (errorDesc.includes('bot was blocked by the user')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.bot_blocked'))
    }

    if (errorDesc.includes('user is deactivated')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.user_deactivated'))
    }

    // Sticker-related errors
    if (errorDesc.includes('stickerset_invalid')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.sticker_set_invalid'))
    }

    if (errorDesc.includes('sticker set full') || errorDesc.includes('too many stickers')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.sticker_set_full'))
    }

    // File size and format errors
    if (errorDesc.includes('request entity too large') || errorDesc.includes('file too big')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.file_too_large'))
    }

    if (errorDesc.includes('message is too long')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.message_too_long'))
    }

    // Network-related errors
    if (errorDesc.includes('timeout') || errorDesc.includes('timed out')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.timeout_error'))
    }

    // Generic Telegram error with specific description
    return ctx.replyWithHTML(ctx.i18n.t('quote.errors.telegram_error', {
      error: error.description
    }))
  }

  // Handle HTTP errors from quote API
  if (error.response && error.response.body) {
    let errorBody;
    try {
      errorBody = JSON.parse(error.response.body);
    } catch (e) {
      console.error('Failed to parse error response body:', e);
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.generic_error', {
        error: 'Invalid error response format'
      }));
    }

    if (errorBody.error.message.includes('file too large')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.file_too_large'))
    }

    if (errorBody.error.message.includes('unsupported format')) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.invalid_format'))
    }

    return ctx.replyWithHTML(ctx.i18n.t('quote.errors.generic_error', {
      error: errorBody.error.message
    }))
  }

  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return ctx.replyWithHTML(ctx.i18n.t('quote.errors.network_error'))
  }

  // Handle sticker set errors by resetting and retrying
  if (error.description && error.description.includes('STICKERSET_INVALID')) {
    // Prevent infinite loops by checking retry count
    if (!ctx.stickerRetryCount) ctx.stickerRetryCount = 0
    ctx.stickerRetryCount++

    if (ctx.stickerRetryCount > 2) {
      console.error('Max sticker retry attempts reached')
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.api_down'))
    }

    // Reset sticker set and try again without custom pack
    if (ctx.session && ctx.session.userInfo) {
      ctx.session.userInfo.tempStickerSet.create = false
      persistUserSetting(ctx, { 'tempStickerSet.create': false })
    }
    return handleQuote(ctx)
  }

  // Fallback for unknown errors
  return ctx.replyWithHTML(ctx.i18n.t('quote.errors.api_down'))
}

module.exports = async (ctx, next) => {
  const t0 = Date.now()
  // Use config from context if available, fallback to local config
  const currentConfig = ctx.config || config || { globalStickerSet: { save_sticker_count: 10, name: 'default' } }
  const flag = {
    count: false,
    reply: false,
    png: false,
    img: false,
    rate: false,
    color: false,
    scale: false,
    crop: false,
    privacy: false,
    ai: false,
    html: false,
    aiQuery: false,
  }

  const isCommand = ctx.message.text ? ctx.message.text.match(/\/q/) : false

  if (ctx.message && ctx.message.text && isCommand) {
    const args = ctx.message.text.split(' ')
    const fullQuery = args.slice(1).join(' ') // Get everything after /q
    args.splice(0, 1)

    flag.count = args.find((arg) => !isNaN(parseInt(arg)))
    flag.reply = args.find((arg) => ['r', 'reply'].includes(arg))
    flag.png = args.find((arg) => ['p', 'png'].includes(arg))
    flag.img = args.find((arg) => ['i', 'img'].includes(arg))
    flag.rate = args.find((arg) => ['rate'].includes(arg))
    flag.hidden = args.find((arg) => ['h', 'hidden'].includes(arg))
    flag.media = args.find((arg) => ['m', 'media'].includes(arg))
    flag.scale = args.find((arg) => arg.match(/s([+-]?(?:\d*\.)?\d+)/))
    flag.crop = args.find((arg) => ['c', 'crop'].includes(arg))
    flag.ai = args.find((arg) => ['*'].includes(arg))
    flag.html = args.find((arg) => ['h', 'html'].includes(arg))
    flag.stories = args.find((arg) => ['s', 'stories'].includes(arg))

    // Check if this is an AI query (text without reply that's not just flags/colors)
    if (fullQuery && !ctx.message.reply_to_message && fullQuery.length > 2) {
      const knownFlags = ['r', 'reply', 'p', 'png', 'i', 'img', 'rate', 'h', 'hidden', 'm', 'media', 'c', 'crop', '*', 'html', 's', 'stories']
      const isValidColor = /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\([^)]+\)|[a-zA-Z]+|random|transparent|\/\/[0-9a-fA-F]{6})$/.test(fullQuery.trim())
      const isOnlyFlags = args.every(arg => knownFlags.includes(arg) || !isNaN(parseInt(arg)) || arg.match(/s([+-]?(?:\d*\.)?\d+)/))

      if (!isValidColor && !isOnlyFlags) {
        flag.aiQuery = fullQuery
      }
    }

    // Only set color if it's not an AI query
    if (!flag.aiQuery) {
      flag.color = args.find((arg) => (!Object.values(flag).find((f) => arg === f)))
    }

    if (flag.scale) flag.scale = flag.scale.match(/s([+-]?(?:\d*\.)?\d+)/)[1]
  }

  // Batch forwarded messages in DM: Telegram sends separate updates for each
  // forwarded message, but the user intends them as one quote. Only the
  // message with the lowest message_id wins the 150ms window; the rest bail.
  //
  // Skipped for explicit /q commands (single intent, nothing to batch) and
  // when there's a reply_to_message (user is targeting a specific message).
  if (ctx.chat.type === 'private' && !isCommand && !ctx.message.reply_to_message) {
    const userId = ctx.from.id
    const msgId = ctx.message.message_id
    if (!minIdsInChat[userId]) {
      minIdsInChat[userId] = { id: msgId, ts: Date.now() }
    } else {
      minIdsInChat[userId].id = Math.min(minIdsInChat[userId].id, msgId)
      minIdsInChat[userId].ts = Date.now()
    }
    await sleep(150)
    if (minIdsInChat[userId]?.id !== msgId) return next()
    delete minIdsInChat[userId]
  }

  ctx.replyWithChatAction('choose_sticker')

  // set background color
  let backgroundColor

  if (flag.color) {
    if (flag.color === 'random') {
      backgroundColor = `${generateRandomColor()}/${generateRandomColor()}`
    } else if (flag.color === '//random') {
      backgroundColor = `//${generateRandomColor()}`
    } else if (flag.color === 'transparent') {
      backgroundColor = 'rgba(0,0,0,0)'
    } else {
      backgroundColor = flag.color
    }
  } else if (ctx.group && ctx.group.info && ctx.group.info.settings && ctx.group.info.settings.quote && ctx.group.info.settings.quote.backgroundColor) {
    backgroundColor = ctx.group.info.settings.quote.backgroundColor
  } else if (ctx.session && ctx.session.userInfo && ctx.session.userInfo.settings && ctx.session.userInfo.settings.quote && ctx.session.userInfo.settings.quote.backgroundColor) {
    backgroundColor = ctx.session.userInfo.settings.quote.backgroundColor
  }

  if (!backgroundColor) {
    backgroundColor = '//#292232'
  }

  let emojiBrand = 'apple'
  if (ctx.group && ctx.group.info && ctx.group.info.settings && ctx.group.info.settings.quote && ctx.group.info.settings.quote.emojiBrand) {
    emojiBrand = ctx.group.info.settings.quote.emojiBrand
  } else if (ctx.session && ctx.session.userInfo && ctx.session.userInfo.settings && ctx.session.userInfo.settings.quote && ctx.session.userInfo.settings.quote.emojiBrand) {
    emojiBrand = ctx.session.userInfo.settings.quote.emojiBrand
  }

  if ((ctx.group && ctx.group.info && ctx.group.info.settings && ctx.group.info.settings.hidden) || (ctx.session && ctx.session.userInfo && ctx.session.userInfo.settings && ctx.session.userInfo.settings.hidden)) flag.hidden = true


  const maxQuoteMessage = 50
  let firstMessage
  let messageCount = flag.count || 1

  let messages = []

  if (ctx.chat.type === 'private' && !ctx.message.reply_to_message) {
    firstMessage = JSON.parse(JSON.stringify(ctx.message)) // copy message
    messageCount = maxQuoteMessage
  } else {
    firstMessage = ctx.message.reply_to_message

    if (!firstMessage || !firstMessage.message_id) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.empty_forward'), {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      })
    }
  }

  messageCount = Math.min(messageCount, maxQuoteMessage)

  let startMessage = firstMessage.message_id
  let quoteMessages = []
  let quoteEmojis = ''

  if (isCommand && !ctx.message.reply_to_message) {
    if (ctx.chat.type === 'private') {
      startMessage += 1
    }
  }

  if (messageCount < 0) {
    messageCount = Math.abs(messageCount)
    startMessage -= messageCount - 1
  }

  // Skip message fetching if we already have AI-selected messages
  if (!flag.aiQuery) {
    // if firstMessage exists, get messages
    if (!flag.reply && firstMessage && firstMessage.from.is_bot && firstMessage.message_id === startMessage) {
      messages.push(firstMessage)
      startMessage += 1
      messageCount -= 1
    }

    if (isCommand && ctx.message.external_reply) {
      messages.push(Object.assign(ctx.message.external_reply, {
        message_id: ctx.message.message_id,
        quote: ctx.message.quote
      }))
    }

    const tCollectStart = Date.now()
    try {
      const tdlibMessages = await ctx.tdlib.getMessages(ctx.message.chat.id, (() => {
        const m = []
        for (let i = 0; i < messageCount; i++) {
          m.push(startMessage + i)
        }
        return m
      })())
      messages.push(...tdlibMessages)
    } catch (error) {
      console.error('TDLib getMessages failed:', error.message)
      // Fallback: use only the replied message if available
      if (firstMessage) {
        messages.push(firstMessage)
      } else {
        return ctx.replyWithHTML(ctx.i18n.t('quote.errors.api_down'), {
          reply_to_message_id: ctx.message.message_id,
          allow_sending_without_reply: true
        })
      }
    }
    ctx.state.collectMs = Date.now() - tCollectStart
  }

  messages = messages.filter((message) => message && Object.keys(message).length !== 0)

  // Filter out messages sent by this bot (e.g. Gramads ads that may arrive during collection)
  if (ctx.me) {
    messages = messages.filter((message) => !(message.from && message.from.is_bot && message.from.username === ctx.me))
  }

  // Send Gramads ad after messages are collected to prevent ads from being included in quotes
  if (ctx.chat.type === 'private' && ctx.from && (ctx.from.language_code === 'ru' || (ctx.session && ctx.session.userInfo && ctx.session.userInfo.settings && ctx.session.userInfo.settings.locale === 'ru'))) {
    sendGramadsAd(ctx.from.id).catch(() => {})
  }

  if (ctx.message.quote && messages[0]) {
    messages[0].quote = ctx.message.quote
  }

  if (messages.length <= 0) {
    if (process.env.GROUP_ID) {
      for (let index = 1; index < messageCount; index++) {
        const chatForward = process.env.GROUP_ID

        const message = await ctx.telegram.forwardMessage(chatForward, ctx.message.chat.id, startMessage + index).catch(() => {})
        messages.push(message)
      }
    }
  }

  if (!messages.find((message) => {
    return message?.message_id === firstMessage?.message_id
  }) && !isCommand && ctx.chat.type !== 'private') {
    if (parseInt(flag.count) < 0) {
      messages.push(firstMessage)
    } else {
      messages.splice(0, 0, firstMessage)
    }
  }

  let lastSenderId = null
  for (let index = 0; index < messages.length; index++) {
    const quoteMessage = messages[index]

    if (quoteMessage?.message_id === undefined) {
      continue
    }

    if (ctx.chat.type === 'private' && !quoteMessage) break

    let messageFrom

    // Sender attribution, in priority order. The modern path is MessageOrigin
    // (forward_origin on forwards, .origin on ExternalReplyInfo — same schema,
    // different field name per Bot API). Legacy fields only fire when origin
    // didn't produce a sender. The hidden_user branch optionally enriches via
    // DB lookup when `flag.hidden` is on.
    const mainOrigin = quoteMessage.forward_origin || quoteMessage.origin
    messageFrom = resolveMessageOrigin(mainOrigin)

    const fwdName = quoteMessage.forward_sender_name
    const canEnrichHidden = flag.hidden && fwdName && (mainOrigin?.type === 'hidden_user' || !messageFrom)
    if (canEnrichHidden) messageFrom = await enrichHiddenUser(ctx, fwdName)

    if (!messageFrom) {
      if (fwdName) messageFrom = stubFromName(fwdName)
      else if (quoteMessage.forward_from_chat) messageFrom = quoteMessage.forward_from_chat
      else if (quoteMessage.forward_from) messageFrom = quoteMessage.forward_from
      else if (quoteMessage.sender_chat) messageFrom = senderFromChat(quoteMessage.sender_chat)
      else if (quoteMessage.from) messageFrom = quoteMessage.from
    }

    if (messageFrom.title) messageFrom.name = messageFrom.title
    if (messageFrom.first_name) messageFrom.name = messageFrom.first_name
    if (messageFrom.last_name) messageFrom.name += ' ' + messageFrom.last_name

    // Forward detection is done once up front so the streak check below can
    // use the *effective* sender id (forwarder in groups, original author in
    // DMs). Previously `diffUser` was computed against the pre-override
    // messageFrom, which misattributed streaks for consecutive forwards.
    const isForwarded = !!(quoteMessage.forward_from || quoteMessage.forward_from_chat || quoteMessage.forward_sender_name || quoteMessage.forward_origin)
    const groupForwarder = (isForwarded && ctx.chat.type !== 'private')
      ? (quoteMessage.sender_chat || quoteMessage.from)
      : null
    const effectiveSenderId = groupForwarder?.id ?? messageFrom.id

    let diffUser = true
    if (lastSenderId !== null && effectiveSenderId === lastSenderId) diffUser = false

    const message = {}
    // Preserve the Telegram timestamp so the archive shows when the message
    // was actually sent, not when the quote was generated (denormalize-quote
    // reads this as the authoritative source.date for DMs).
    if (quoteMessage.date) message.date = quoteMessage.date

    let text

    if (quoteMessage.caption) {
      text = quoteMessage.caption
      message.entities = quoteMessage.caption_entities
    } else {
      text = quoteMessage.text
      message.entities = quoteMessage.entities
    }

    if (quoteMessage.quote) {
      text = quoteMessage.quote.text
      message.entities = quoteMessage.quote.entities
      message.isQuote = true
    }

    // Align with Telegram: captioned media should show BOTH caption and media.
    // The legacy rule was "only attach media when text is absent", which
    // silently dropped photos/videos from the most common message shape
    // (photo + caption). We now include media whenever the message has any,
    // and only use `mediaCrop` for the text-absent case so quote-api knows
    // to size the sticker around the image rather than the caption.
    const hasAnyMedia = !!(quoteMessage.photo || quoteMessage.sticker || quoteMessage.animation
      || quoteMessage.video || quoteMessage.video_note || quoteMessage.document
      || quoteMessage.audio || quoteMessage.voice || quoteMessage.paid_media || quoteMessage.story)
    if (!text) {
      flag.media = true
      message.mediaCrop = flag.crop || false
    } else if (hasAnyMedia) {
      flag.media = true
    }
    if (flag.media && quoteMessage.photo) {
      message.media = quoteMessage.photo
      message.mediaType = 'photo'
    }
    if (flag.media && quoteMessage.sticker) {
      const sticker = quoteMessage.sticker
      // Static stickers (.webp) render as <img>; video stickers (.webm)
      // stream as <video> with a thumbnail poster; animated stickers (.tgs =
      // gzipped Lottie JSON) are rendered by the webapp's TgsPlayer, which
      // ungzips and hands the JSON to lottie-web. For all three we save
      // the thumb (static preview) and the actual sticker file_id.
      const thumb = sticker.thumb || sticker.thumbnail
      message.media = sticker.is_video || sticker.is_animated
        ? [thumb].filter(Boolean)
        : [sticker]
      message.mediaType = 'sticker'
      message.stickerIsAnimated = !!sticker.is_animated
      message.stickerIsVideo = !!sticker.is_video
      if (sticker.is_video || sticker.is_animated) message.mediaFileId = sticker.file_id
    }
    // Save BOTH the thumbnail (for static preview) and the actual media's
    // file_id + mime_type so the webapp can switch to an inline <video> /
    // <audio> player on user interaction. Streams through /api/tg/file.
    if (flag.media && quoteMessage.animation) {
      message.media = [quoteMessage.animation.thumbnail].filter(Boolean)
      message.mediaType = 'animation'
      message.mediaFileId = quoteMessage.animation.file_id
      message.mediaMimeType = quoteMessage.animation.mime_type
    } else if (flag.media && quoteMessage.video) {
      message.media = [quoteMessage.video.thumbnail].filter(Boolean)
      message.mediaType = 'video'
      message.mediaFileId = quoteMessage.video.file_id
      message.mediaMimeType = quoteMessage.video.mime_type
    }
    if (flag.media && quoteMessage.video_note) {
      message.media = [quoteMessage.video_note.thumbnail].filter(Boolean)
      message.mediaType = 'video_note'
      message.mediaFileId = quoteMessage.video_note.file_id
    }
    if (flag.media && quoteMessage.document) {
      if (quoteMessage.document.thumbnail) message.media = [quoteMessage.document.thumbnail]
      message.mediaType = 'document'
      message.mediaFileId = quoteMessage.document.file_id
      message.mediaMimeType = quoteMessage.document.mime_type
      message.mediaFileName = quoteMessage.document.file_name
    }
    if (flag.media && quoteMessage.audio) {
      if (quoteMessage.audio.thumbnail) message.media = [quoteMessage.audio.thumbnail]
      message.mediaType = 'audio'
      message.mediaFileId = quoteMessage.audio.file_id
      message.mediaMimeType = quoteMessage.audio.mime_type
      message.audioTitle = quoteMessage.audio.title
      message.audioPerformer = quoteMessage.audio.performer
      message.audioDuration = quoteMessage.audio.duration
    }
    if (flag.media && quoteMessage.voice) {
      message.voice = {
        waveform: quoteMessage.voice.waveform || [],
        duration: quoteMessage.voice.duration || 0,
        fileId: quoteMessage.voice.file_id,
        mimeType: quoteMessage.voice.mime_type
      }
    }
    // Paid media (Bot API 7.5+). PaidMediaInfo wraps an array of items —
    // each PaidMediaPhoto / PaidMediaVideo / PaidMediaPreview. We surface
    // the first media's thumbnail and tag it so the webapp can overlay a
    // stars-badge and "paid" label.
    if (flag.media && quoteMessage.paid_media) {
      const first = quoteMessage.paid_media.paid_media?.[0]
      if (first?.type === 'photo' && Array.isArray(first.photo)) {
        message.media = first.photo
        message.mediaType = 'paid_photo'
      } else if (first?.type === 'video' && first.video?.thumbnail) {
        message.media = [first.video.thumbnail]
        message.mediaType = 'paid_video'
      } else if (first?.type === 'preview') {
        message.mediaType = 'paid_preview'
      }
      message.paidStars = quoteMessage.paid_media.star_count
    }
    // Story forwards (Bot API 7.0+). The Story object only carries chat
    // and id — no preview bytes — so we attribute to the chat and tag
    // type='story' for the webapp to render a dedicated badge.
    if (quoteMessage.story) {
      messageFrom = quoteMessage.story.chat
      message.mediaType = 'story'
      message.storyId = quoteMessage.story.id
    }
    // Propagate the media-spoiler flag (Bot API 7.0+) so the webapp can
    // render a blurred preview matching Telegram's native "tap to reveal".
    if (quoteMessage.has_media_spoiler) message.hasMediaSpoiler = true
    // Caption-above-media is a Telegram 10.0 UI hint — preserved for the
    // webapp so it can position the caption before the thumbnail.
    if (quoteMessage.show_caption_above_media) message.captionAboveMedia = true

    if (messageFrom.id) {
      message.chatId = messageFrom.id
    } else {
      message.chatId = hashCode(quoteMessage.from.name)
    }

    // Name on first message in streak
    const isFirstInStreak = diffUser && !(ctx.me && quoteMessage.from && ctx.me === quoteMessage.from.username && index > 0)

    // Always pass from (needed for avatar/color), control name separately
    message.from = { ...messageFrom }
    if (!isFirstInStreak) {
      if (!message.from.first_name) {
        const nameSource = message.from.name || message.from.title
        if (nameSource && typeof nameSource === 'string') {
          const nameParts = nameSource.split(' ')
          message.from.first_name = nameParts[0]
          if (nameParts.length > 1) message.from.last_name = nameParts.slice(1).join(' ')
        }
      }
      message.from.name = false
    }
    message.avatar = true
    if (text) message.text = text

    // Forward label: only show in groups, in DMs treat as own message.
    // Keep `label` for quote-api image rendering; also surface `name` and
    // `from` so the webapp can render the Telegram-style block with an
    // avatar circle of the original source.
    if (isForwarded && ctx.chat.type !== 'private') {
      let forwardFromName = ''
      let forwardFrom
      // Prefer forward_origin (Bot API 7.0+) — covers cases where Telegram
      // no longer fills the legacy fields (hidden users, some channel posts).
      const fwdOriginRaw = quoteMessage.forward_origin
      if (fwdOriginRaw) {
        if (fwdOriginRaw.type === 'user' && fwdOriginRaw.sender_user) {
          const u = fwdOriginRaw.sender_user
          forwardFromName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.title || ''
          forwardFrom = { id: u.id, username: u.username, kind: 'user' }
        } else if (fwdOriginRaw.type === 'hidden_user') {
          forwardFromName = fwdOriginRaw.sender_user_name || ''
          forwardFrom = { kind: 'hidden' }
        } else if (fwdOriginRaw.type === 'chat' || fwdOriginRaw.type === 'channel') {
          const c = fwdOriginRaw.chat || fwdOriginRaw.sender_chat
          if (c) {
            forwardFromName = c.title || ''
            forwardFrom = { id: c.id, username: c.username, kind: 'chat' }
          }
        }
      }
      // Fall back to legacy fields if origin was absent or malformed.
      if (!forwardFrom) {
        if (quoteMessage.forward_from) {
          forwardFromName = [quoteMessage.forward_from.first_name, quoteMessage.forward_from.last_name].filter(Boolean).join(' ') || quoteMessage.forward_from.title || ''
          forwardFrom = {
            id: quoteMessage.forward_from.id,
            username: quoteMessage.forward_from.username,
            kind: 'user'
          }
        } else if (quoteMessage.forward_from_chat) {
          forwardFromName = quoteMessage.forward_from_chat.title || ''
          forwardFrom = {
            id: quoteMessage.forward_from_chat.id,
            username: quoteMessage.forward_from_chat.username,
            kind: 'chat'
          }
        } else if (quoteMessage.forward_sender_name) {
          forwardFromName = quoteMessage.forward_sender_name
          forwardFrom = { kind: 'hidden' }
        }
      }
      message.forward = {
        label: forwardFromName ? `Forwarded from ${forwardFromName}` : 'Forwarded message',
        name: forwardFromName || undefined,
        from: forwardFrom
      }

      // In groups, show the actual forwarder as sender (not the original author).
      // The original author is already displayed in the forward label. The
      // `groupForwarder` was computed up-top so streak detection used its id.
      if (groupForwarder) {
        const fwdName = groupForwarder.first_name
          ? [groupForwarder.first_name, groupForwarder.last_name].filter(Boolean).join(' ')
          : (groupForwarder.title || groupForwarder.name || '')
        message.from = {
          id: groupForwarder.id,
          first_name: groupForwarder.first_name || groupForwarder.title,
          last_name: groupForwarder.last_name,
          username: groupForwarder.username,
          name: isFirstInStreak ? fwdName : false,
          photo: groupForwarder.photo
        }
        message.chatId = groupForwarder.id
        messageFrom = groupForwarder
      }
    }

    // Sender tag (user role/custom title in group)
    // Available from Bot API 9.5+ (sender_tag field) and TDLib newer versions
    // Falls back to author_signature for channel posts
    if (quoteMessage.sender_tag) {
      message.senderTag = quoteMessage.sender_tag
    } else if (quoteMessage.author_signature) {
      message.senderTag = quoteMessage.author_signature
    } else if (messageFrom.author_signature) {
      message.senderTag = messageFrom.author_signature
    }

    if (!flag.privacy && message.from) {
      if (ctx.group && ctx.group.info && ctx.group.info.settings && ctx.group.info.settings.privacy && !ctx.chat.username) {
        flag.privacy = true
      } else {
        // Cache privacy settings to avoid repeated DB queries
        const cacheKey = `privacy_${message.from.id}`
        if (!ctx.privacyCache) ctx.privacyCache = new Map()

        if (ctx.privacyCache.has(cacheKey)) {
          flag.privacy = ctx.privacyCache.get(cacheKey)
        } else {
          const quotedFind = await ctx.db.User.findOne({ telegram_id: message.from.id }).lean()
          const hasPrivacy = quotedFind && quotedFind.settings.privacy
          ctx.privacyCache.set(cacheKey, hasPrivacy)
          if (hasPrivacy) flag.privacy = true
        }
      }
    }

    message.replyMessage = {}
    if (flag.reply && quoteMessage.reply_to_message) {
      const r = quoteMessage.reply_to_message

      // Reply attribution: same logic as main message sender, factored
      // through the shared helpers so both paths stay in lockstep.
      const replyOrigin = r.forward_origin || r.origin
      let replyMessageFrom = resolveMessageOrigin(replyOrigin)

      const replyFwdName = r.forward_sender_name
      const enrichReplyHidden = flag.hidden && replyFwdName && (replyOrigin?.type === 'hidden_user' || !replyMessageFrom)
      if (enrichReplyHidden) replyMessageFrom = await enrichHiddenUser(ctx, replyFwdName)

      if (!replyMessageFrom) {
        if (replyFwdName) replyMessageFrom = stubFromName(replyFwdName)
        else if (r.forward_from_chat) replyMessageFrom = r.forward_from_chat
        else if (r.forward_from) replyMessageFrom = r.forward_from
        else if (r.sender_chat) replyMessageFrom = senderFromChat(r.sender_chat)
        else if (r.from) replyMessageFrom = r.from
      }

      if (replyMessageFrom) {
        if (replyMessageFrom.title) replyMessageFrom.name = replyMessageFrom.title
        if (replyMessageFrom.first_name) replyMessageFrom.name = replyMessageFrom.first_name
        if (replyMessageFrom.last_name) replyMessageFrom.name += ' ' + replyMessageFrom.last_name

        message.replyMessage.name = replyMessageFrom.name
        if (replyMessageFrom.id) {
          message.replyMessage.chatId = replyMessageFrom.id
        } else {
          message.replyMessage.chatId = hashCode(replyMessageFrom.name)
        }
      }

      message.replyMessage.text = r.text || r.caption || undefined
      message.replyMessage.entities = r.entities || r.caption_entities || undefined

      // Save reply media metadata so the webapp can render a Telegram-style
      // preview (thumbnail + kind label). Without this, reply-to-media shows
      // only an ellipsis when the replied message had no text caption.
      const smallestThumb = (arr) => Array.isArray(arr) && arr[0]?.file_id
      const stickerThumb = r.sticker && (r.sticker.thumb?.file_id || r.sticker.thumbnail?.file_id)
      if (r.photo) message.replyMessage.media = { kind: 'photo', fileId: smallestThumb(r.photo) || undefined }
      else if (r.sticker) message.replyMessage.media = { kind: 'sticker', fileId: stickerThumb || undefined }
      else if (r.animation) message.replyMessage.media = { kind: 'animation', fileId: r.animation.thumbnail?.file_id }
      else if (r.video) message.replyMessage.media = { kind: 'video', fileId: r.video.thumbnail?.file_id }
      else if (r.video_note) message.replyMessage.media = { kind: 'video_note', fileId: r.video_note.thumbnail?.file_id }
      else if (r.voice) message.replyMessage.media = { kind: 'voice', duration: r.voice.duration }
      else if (r.audio) message.replyMessage.media = { kind: 'audio', duration: r.audio.duration }
      else if (r.document) message.replyMessage.media = { kind: 'document', fileId: r.document.thumbnail?.file_id }
    }

    if (!message.text && !message.media && !message.voice) {
      message.text = ctx.i18n.t('quote.unsupported_message')
      message.entities = [{
        offset: 0,
        length: message.text.length,
        type: 'italic'
      }]
    }

    if (message.text) {
      const searchEmojis = emojiDb.searchFromText({ input: message.text, fixCodePoints: true })

      searchEmojis.forEach(v => { quoteEmojis += v.emoji })
    }

    quoteMessages.push(message)

    lastSenderId = messageFrom.id
  }

  // Avatar on last message in streak only
  for (let i = 0; i < quoteMessages.length - 1; i++) {
    if (quoteMessages[i].chatId === quoteMessages[i + 1].chatId) {
      quoteMessages[i].avatar = false
    }
  }

  if (flag.ai) {
    let messageForAIContext = []

    try {
      const aiContextMessages = await ctx.tdlib.getMessages(ctx.message.chat.id, (() => {
        const m = []
        for (let i = 1; i < 10; i++) {
          m.push(startMessage - i)
        }
        return m
      })())
      messageForAIContext.push(...aiContextMessages)
    } catch (error) {
      console.error('TDLib getMessages for AI context failed:', error.message)
      // Continue without AI context if TDLib fails
      messageForAIContext = []
    }

    messageForAIContext = messageForAIContext.filter((message) => message && Object.keys(message).length !== 0)

    messageForAIContext = messageForAIContext.map((message) => {
      if (message.text && message.text.startsWith('/')) return

      const name = message?.from?.title || message.from?.name || message?.from?.first_name + ' ' + message?.from?.last_name || message?.from?.username || 'Anonymous'

      return {
        role: 'user',
        name: name,
        content: (message?.text || message?.caption)?.slice(0, 128)
      }
    }).filter((message) => message && message.content)

    const aiMode = (ctx.group && ctx.group.info && ctx.group.info.settings && ctx.group.info.settings.aiMode) || 'sarcastic'
    const aiModes = require('../config/aiModes')
    const selectedAiMode = aiModes[aiMode] || aiModes.sarcastic

    const locale = (ctx.group && ctx.group.info && ctx.group.info.settings && ctx.group.info.settings.locale) || 'fallback'
    const systemMessage = selectedAiMode.systemPrompt(locale) + `

**Chat Examples (style reference):**
${JSON.stringify(messageForAIContext)}
`;


    const messageForAI = []

    for (const index in quoteMessages) {
      const quoteMessage = quoteMessages[index]

      let userMessage = {
        role: 'user',
        content: quoteMessage?.text?.slice(0, 128) || quoteMessage?.caption?.slice(0, 128) || (quoteMessage.mediaType === 'sticker' ? '[user sent a sticker]' : '[user sent a media]')
      }


      messageForAI.push(userMessage)
    }

    const completion = await openai.chat.completions.create({
      model: 'x-ai/grok-4.1-fast',
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        ...messageForAI
      ],
      max_tokens: 600,

      temperature: 0.7,
      retry: 3
    })

    if (completion?.choices?.length > 0 && completion.choices[0].message?.content) {
      const message = completion.choices[0].message.content

      quoteMessages.push({
        message_id: 1,
        chatId: 6,
        avatar: true,
        from: {
          id: 6,
          name: 'QuotAI',
          photo: {
            url: 'https://telegra.ph/file/20ff3795b173ab91a81e9.jpg'
          }
        },
        text: message.replace(/<|>/g, '').trim(),
        replyMessage: {}
      })
    } else {
      return ctx.replyWithHTML(`🌙✨ <b>The magic spirits are taking a nap</b>\n\n<i>My AI wizard friend seems to be busy brewing other potions right now.</i>\n\n🔮 <i>Give it a moment and try your spell again! 🪄💫</i>`, {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      }).then((res) => {
        setTimeout(() => {
          ctx.deleteMessage(res.message_id)
        }, 8000)
      })
    }
  }

  if (quoteMessages.length < 1) {
    return ctx.replyWithHTML(ctx.i18n.t('quote.empty_forward'), {
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true
    })
  }

  let width = 512
  let height = 512 * 1.5
  let scale = 2

  if (flag.png || flag.img) {
    width *= 1.2
    height *= 15
    scale *= 1.5
  }

  let type = 'quote'

  if (flag.img) type = 'image'
  if (flag.png) type = 'png'

  if (flag.stories) {
    width *= 1.2
    height *= 15
    scale = 3
    type = 'stories'
  }

  let format
  if (type === 'quote') format = 'webp'

  const quoteApiUri = flag.html ? process.env.QUOTE_API_URI_HTML : process.env.QUOTE_API_URI

  // Allocate local_id (per-group quote counter) in parallel with the slow
  // webp generation. Needed pre-send so the "Open in app" button has a URL.
  //
  // global_id (Counter{_id:'quote'}) is NOT allocated here — it's a single
  // shared document across the whole DB and $inc on it serializes under load.
  // We allocate it post-send inside setImmediate, which is fine: global_id
  // only lives on the Quote doc, not on any user-visible reply.
  const hasGroup = !!(ctx.group && ctx.group.info)
  let idsMs = 0
  const localIdPromise = hasGroup
    ? (() => {
        const t = Date.now()
        return ctx.db.Group.findByIdAndUpdate(
          ctx.group.info._id,
          { $inc: { quoteCounter: 1 } },
          { new: true, projection: { quoteCounter: 1 } }
        )
        .then(g => { idsMs = Date.now() - t; return g && g.quoteCounter })
        .catch((err) => {
          idsMs = Date.now() - t
          console.error('[quote] Group $inc failed', err)
          return null
        })
      })()
    : Promise.resolve(null)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30 * 1000)

  const tGenerateStart = Date.now()
  const generatePromise = fetch(
    `${quoteApiUri}/generate.webp?botToken=${process.env.BOT_TOKEN}`,
    {
      method: 'POST',
      body: JSON.stringify({
        type,
        format,
        backgroundColor,
        width,
        height,
        scale: flag.scale || scale,
        messages: quoteMessages,
        emojiBrand
      }),
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    }
  ).then(async (res) => {
    clearTimeout(timeoutId)
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`)
      error.response = { body: await res.text() }
      throw error
    }
    return {
      body: Buffer.from(await res.arrayBuffer()),
      headers: {
        'quote-type': res.headers.get('quote-type') || type
      }
    }
  }).catch((error) => handleQuoteError(ctx, error))

  const [generate, localId] = await Promise.all([generatePromise, localIdPromise])
  const generateMs = Date.now() - tGenerateStart

  if (generate.error) {
    if (generate.error.response && generate.error.response.body) {
      let errorMessage = 'API Error'
      try {
        errorMessage = JSON.parse(generate.error.response.body).error.message
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
        errorMessage = generate.error.response.body.toString()
      }

      return ctx.replyWithHTML(ctx.i18n.t('quote.api_error', {
        error: errorMessage
      }), {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      })
    } else {
      console.error(generate.error)
      return ctx.replyWithHTML(ctx.i18n.t('quote.api_error', {
        error: 'quote_api_down'
      }), {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      })
    }
  }

  let emojis = ctx.group ? ctx.group?.info?.settings?.quote?.emojiSuffix : ctx?.session?.userInfo?.settings?.quote?.emojiSuffix
  if (!emojis || emojis === 'random') {
    emojis = quoteEmojis + emojiArray[Math.floor(Math.random() * emojiArray.length)].emoji
  } else {
    emojis += quoteEmojis
  }

  emojis = `${emojis}💜`

  if (generate.body) {
    const image = generate.body
    try {
      if (generate.headers['quote-type'] === 'quote') {
        const rateEnabled = !!(ctx.group && ctx.group.info && ctx.group.info.settings && (ctx.group.info.settings.rate || flag.rate))
        const deepLinkUrl = (localId != null && hasGroup && ctx.botInfo && ctx.botInfo.username)
          ? deepLink.forQuote(ctx.botInfo.username, String(ctx.group.info._id), localId)
          : null
        const replyMarkup = buildQuoteReplyMarkup({
          rateEnabled,
          deepLinkUrl,
          openInAppLabel: deepLinkUrl ? ctx.i18n.t('app.open_quote') : null
        })

        let sendResult
        const tSendStart = Date.now()

        if (flag.privacy) {
          sendResult = await ctx.replyWithSticker({
            source: image,
            filename: 'quote.webp'
          }, {
            emoji: emojis,
            reply_to_message_id: ctx.message.message_id,
            allow_sending_without_reply: true,
            ...replyMarkup,
            business_connection_id: ctx.update?.business_message?.business_connection_id
          })
        } else {
          if (ctx.session?.userInfo && !ctx.session?.userInfo?.tempStickerSet?.create) {
            const getMe = await telegram.getMe()

            const packName = `temp_${Math.random().toString(36).substring(5)}_${Math.abs(ctx.from.id)}_by_${getMe.username}`
            const packTitle = `Created by @${getMe.username}`

            const created = await telegram.createNewStickerSet(ctx.from.id, packName, packTitle, {
              png_sticker: { source: 'placeholder.png' },
              emojis
            }).catch(() => {
            })

            ctx.session.userInfo.tempStickerSet.name = packName
            ctx.session.userInfo.tempStickerSet.create = created
            persistUserSetting(ctx, {
              'tempStickerSet.name': packName,
              'tempStickerSet.create': created
            })
          }

          let packOwnerId
          let packName

          if (ctx.session?.userInfo && ctx.session?.userInfo?.tempStickerSet?.create && ctx.update.update_id % 5 === 0) {
            packOwnerId = ctx.from.id
            packName = ctx.session.userInfo.tempStickerSet.name
          }

          if (!packOwnerId || !packName) {
            sendResult = await ctx.replyWithSticker({
              source: image,
              filename: 'quote.webp'
            }, {
              emoji: emojis,
              reply_to_message_id: ctx.message.message_id,
              allow_sending_without_reply: true,
              ...replyMarkup,
              business_connection_id: ctx.update?.business_message?.business_connection_id
            })
          } else {
            const addSticker = await ctx.tg.addStickerToSet(packOwnerId, packName.toLowerCase(), {
              png_sticker: { source: image },
              emojis
            }, true).catch((error) => {
              console.error(error)
              if (error.description === 'Bad Request: STICKERSET_INVALID') {
                ctx.session.userInfo.tempStickerSet.create = false
                persistUserSetting(ctx, { 'tempStickerSet.create': false })
              }
            })

            if (!addSticker) {
              return ctx.replyWithHTML(ctx.i18n.t('quote.error'), {
                reply_to_message_id: ctx.message.message_id,
                allow_sending_without_reply: true
              })
            }

            const sticketSet = await ctx.getStickerSet(packName)

            if (ctx.session.userInfo.tempStickerSet.create) {
              // Use for...of loop to properly handle async operations
              (async () => {
                for (const [index, sticker] of sticketSet.stickers.entries()) {
                  if (index > currentConfig.globalStickerSet.save_sticker_count - 1) {
                    // Delay deletion but don't block response
                    setTimeout(() => {
                      telegram.deleteStickerFromSet(sticker.file_id).catch(() => {})
                    }, 3000 + (index * 100)) // Stagger deletions
                  }
                }
              })()
            }

            sendResult = await ctx.replyWithSticker(sticketSet.stickers[sticketSet.stickers.length - 1].file_id, {
              reply_to_message_id: ctx.message.message_id,
              allow_sending_without_reply: true,
              ...replyMarkup,
              business_connection_id: ctx.update?.business_message?.business_connection_id
            })
          }
        }

        const sendMs = sendResult ? Date.now() - tSendStart : null

        if (sendResult && hasGroup) {
          // Capture minimal refs for the async job; all CPU work (JSON size
          // check, denormalization, member dedup) runs off the hot path.
          const groupInfo = ctx.group.info
          const storeText = groupInfo.settings?.archive?.storeText ?? true
          const privacy = !!flag.privacy
          const sticker = sendResult.sticker
          const userInfo = ctx.session.userInfo
          const message = ctx.message
          const packaging = {
            backgroundColor,
            emojiBrand,
            scale: flag.scale || scale,
            width,
            height,
            type,
            format
          }

          setImmediate(async () => {
            try {
              const doc = {
                group: groupInfo,
                user: userInfo,
                file_id: sticker.file_id,
                file_unique_id: sticker.file_unique_id
              }
              if (localId != null) doc.local_id = localId

              let denorm = null
              if (storeText) {
                const payload = { version: 1, messages: quoteMessages, ...packaging }
                const payloadBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8')
                if (payloadBytes <= 1_000_000) {
                  doc.payload = payload
                  denorm = denormalizeQuote(quoteMessages, message, { privacy })
                  doc.authors = denorm.authors
                  doc.hasVoice = denorm.hasVoice
                  doc.hasMedia = denorm.hasMedia
                  doc.messageCount = denorm.messageCount
                  doc.source = denorm.source
                } else {
                  console.warn('[quote] payload exceeds 1MB cap, skipping archive fields', {
                    payloadBytes
                  })
                }
              }

              if (rateEnabled) {
                doc.rate = {
                  votes: [
                    { name: '👍', vote: [] },
                    { name: '👎', vote: [] }
                  ],
                  score: 0
                }
              }

              const quoterTgId = userInfo && userInfo.telegram_id
              const authorTgIds = ((denorm && denorm.authors) || [])
                .map(a => a && a.telegram_id)
                .filter(id => typeof id === 'number' && id > 0)
              const memberTgIds = [...new Set([quoterTgId, ...authorTgIds].filter(id => typeof id === 'number' && id > 0))]

              try {
                const counter = await ctx.db.Counter.findOneAndUpdate(
                  { _id: 'quote' },
                  { $inc: { seq: 1 } },
                  { new: true, upsert: true, projection: { seq: 1 } }
                )
                if (counter && counter.seq != null) doc.global_id = counter.seq
              } catch (err) {
                console.error('[quote] Counter $inc failed', err)
              }

              await persistQuoteArtifacts({
                db: ctx.db,
                doc,
                groupId: groupInfo._id,
                memberTgIds
              })
            } catch (err) {
              console.error('[quote] post-send job failed', err)
            }
          })
        }

        // Temporary perf probe — strip after 48h of stable readings.
        // Tracked in docs/superpowers/specs/2026-04-19-quote-hot-path-redesign.md §5.
        if (sendResult) {
          console.log('[quote:timing]', {
            total_ms: Date.now() - t0,
            collect_ms: ctx.state.collectMs ?? null,
            generate_ms: generateMs,
            ids_ms: idsMs,
            send_ms: sendMs,
            chat_type: ctx.chat.type,
            had_button: localId != null,
            had_group: hasGroup
          })
        }

        // Show onboarding step 2 after first quote in private chat
        if (sendResult && ctx.chat.type === 'private') {
          const { isInOnboarding, showOnboardingStep2 } = require('./onboarding')
          if (isInOnboarding(ctx)) {
            await showOnboardingStep2(ctx)
          }
        }
      } else if (generate.headers['quote-type'] === 'image') {
        await ctx.replyWithPhoto({
          source: image,
          filename: 'quote.png'
        }, {
          reply_to_message_id: ctx.message.message_id,
          allow_sending_without_reply: true
        })
      } else {
        try {
          await ctx.replyWithDocument({
            source: image,
            filename: 'quote.png'
          }, {
            reply_to_message_id: ctx.message.message_id,
            allow_sending_without_reply: true,
            business_connection_id: ctx.update?.business_message?.business_connection_id
          })
        } catch (error) {
          return handleQuoteError(ctx, error)
        }
      }
    } catch (error) {
      return handleQuoteError(ctx, error)
    } finally {
      // Clean up cache to prevent memory leaks
      if (ctx.privacyCache && ctx.privacyCache.size > 100) {
        ctx.privacyCache.clear()
      }
      if (ctx.forwardCache && ctx.forwardCache.size > 50) {
        ctx.forwardCache.clear()
      }
    }
  }
}

// Initialize sticker pack cleaning with delay to allow config loading
setTimeout(() => {
  startClearStickerPack(config)
}, 1000)

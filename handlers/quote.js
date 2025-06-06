const Markup = require('telegraf/markup')
const Telegram = require('telegraf/telegram')
const fs = require('fs')
const got = require('got')
const {
  OpenAI
} = require('openai')
const Anthropic = require('@anthropic-ai/sdk')
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

const describeImage = async (image, language = 'en') => {
  const result = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert image description assistant. Provide a clear, natural description of the image in ${language} language. Focus on key visual elements, people, actions, emotions, and context. Keep descriptions concise (2-3 sentences max).`
      },
      {
        role: 'user',
        content: image
      }
    ],
    max_tokens: 150,
    temperature: 0.7
  })

  return result.choices[0].message.content
}

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))

// for create global sticker pack
// telegram.createNewStickerSet(66478514, 'created_by_QuotLyBot', 'Created by @QuotLyBot', {
//   png_sticker: { source: 'placeholder.png' },
//   emojis: '💜'
// }).then(console.log)

let botInfo
let clearStickerPackTimer

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Cleans old stickers from the sticker pack periodically
async function startClearStickerPack() {
  if (clearStickerPackTimer) return

  clearStickerPackTimer = setInterval(async () => {
    try {
      if (!botInfo) botInfo = await telegram.getMe()

      const stickerSet = await telegram.getStickerSet(config.globalStickerSet.name + botInfo.username)
        .catch((error) => {
          console.log('clearStickerPack error:', error)
        })

      if (!stickerSet) return

      const stickersToDelete = stickerSet.stickers.slice(config.globalStickerSet.save_sticker_count)

      for (const sticker of stickersToDelete) {
        await telegram.deleteStickerFromSet(sticker.file_id)
          .catch(console.error)
      }
    } catch (error) {
      console.error('Sticker cleanup error:', error)
    }
  }, 5000) // Run every 5 seconds

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

const generateRandomColor = () => {
  const rawColor = (Math.floor(Math.random() * 16777216)).toString(16)
  const color = '0'.repeat(6 - rawColor.length) + rawColor
  return `#${color}`
}

const minIdsInChat = {}

const handleQuoteError = async (ctx, error) => {
  console.error('Quote error:', error)

  // API rate limiting
  if (error.response?.statusCode === 429) {
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
  if (error.response?.body) {
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
  if (error.description?.includes('STICKERSET_INVALID')) {
    // Prevent infinite loops by checking retry count
    if (!ctx.stickerRetryCount) ctx.stickerRetryCount = 0
    ctx.stickerRetryCount++

    if (ctx.stickerRetryCount > 2) {
      console.error('Max sticker retry attempts reached')
      return ctx.replyWithHTML(ctx.i18n.t('quote.errors.api_down'))
    }

    // Reset sticker set and try again without custom pack
    if (ctx.session?.userInfo) {
      ctx.session.userInfo.tempStickerSet.create = false
    }
    return handleQuote(ctx)
  }

  // Fallback for unknown errors
  return ctx.replyWithHTML(ctx.i18n.t('quote.errors.api_down'))
}

module.exports = async (ctx, next) => {
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
  }

  const isCommand = ctx.message.text ? ctx.message.text.match(/\/q/) : false

  if (ctx.message && ctx.message.text && isCommand) {
    const args = ctx.message.text.split(' ')
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
    flag.color = args.find((arg) => (!Object.values(flag).find((f) => arg === f)))

    if (flag.scale) flag.scale = flag.scale.match(/s([+-]?(?:\d*\.)?\d+)/)[1]
  }

  if (ctx.chat.type === 'private') {
    // flag.reply = true
    if (!minIdsInChat[ctx.from.id]) minIdsInChat[ctx.from.id] = ctx.message.message_id
    minIdsInChat[ctx.from.id] = Math.min(minIdsInChat[ctx.from.id], ctx.message.message_id)
    await sleep(200)
    if (minIdsInChat[ctx.from.id] !== ctx.message.message_id) return next()
    delete minIdsInChat[ctx.from.id]
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
  } else if (ctx.group && ctx?.group?.info?.settings?.quote?.backgroundColor) {
    backgroundColor = ctx?.group?.info?.settings?.quote?.backgroundColor
  } else if (ctx.session?.userInfo?.settings?.quote?.backgroundColor) {
    backgroundColor = ctx.session.userInfo.settings.quote.backgroundColor
  }

  if (!backgroundColor) {
    backgroundColor = '//#292232'
  }

  let emojiBrand = 'apple'
  if (ctx.group && ctx.group.info.settings.quote.emojiBrand) {
    emojiBrand = ctx.group.info.settings.quote.emojiBrand
  } else if (ctx.session?.userInfo?.settings?.quote?.emojiBrand) {
    emojiBrand = ctx.session.userInfo.settings.quote.emojiBrand
  }

  if ((ctx.group && ctx.group?.info?.settings?.hidden) || ctx.session?.userInfo?.settings?.hidden) flag.hidden = true


  const maxQuoteMessage = 50
  let firstMessage
  let messageCount = flag.count || 1

  let messages = []

  if (ctx.chat.type === 'private' && !ctx.message.reply_to_message) {
    firstMessage = JSON.parse(JSON.stringify(ctx.message)) // copy message
    messageCount = maxQuoteMessage
  } else {
    firstMessage = ctx.message.reply_to_message

    if (!firstMessage?.message_id) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.empty_forward'), {
        reply_to_message_id: ctx.message.message_id,
          allow_sending_without_reply: true,
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

  messages = messages.filter((message) => message && Object.keys(message).length !== 0)

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
  }) && !isCommand) {
    if (parseInt(flag.count) < 0) {
      messages.push(firstMessage)
    } else {
      messages.splice(0, 0, firstMessage)
    }
  }

  let lastMessage
  for (const index in messages) {
    const quoteMessage = messages[index]

    if (quoteMessage?.message_id === undefined) {
      continue
    }

    if (ctx.chat.type === 'private' && !quoteMessage) break

    let messageFrom

    if (quoteMessage.origin) {
      if (quoteMessage.origin.type === "user" && quoteMessage.origin.sender_user) {
      messageFrom = quoteMessage.origin.sender_user;
      } else if (quoteMessage.origin.type === "hidden_user") {
      messageFrom = {
        id: hashCode(quoteMessage.origin.sender_user_name),
        name: quoteMessage.origin.sender_user_name
      };
      } else if (quoteMessage.origin.type === "chat" && quoteMessage.origin.sender_chat) {
      messageFrom = quoteMessage.origin.sender_chat;
      if (quoteMessage.origin.author_signature) {
        messageFrom.author_signature = quoteMessage.origin.author_signature;
      }
      } else if (quoteMessage.origin.type === "channel") {
      messageFrom = quoteMessage.origin.chat;
      if (quoteMessage.origin.author_signature) {
        messageFrom.author_signature = quoteMessage.origin.author_signature;
      }
      } else if (quoteMessage.origin.sender) {
      // Fallback for backward compatibility
      messageFrom = quoteMessage.origin.sender;
      }
    }

    if (quoteMessage.forward_sender_name) {
      if (flag.hidden) {
        // Cache forward name lookups
        const forwardCacheKey = `forward_${quoteMessage.forward_sender_name}`
        if (!ctx.forwardCache) ctx.forwardCache = new Map()

        let sarchForwardName
        if (ctx.forwardCache.has(forwardCacheKey)) {
          sarchForwardName = ctx.forwardCache.get(forwardCacheKey)
        } else {
          sarchForwardName = await ctx.db.User.find({
            full_name: quoteMessage.forward_sender_name
          }).limit(2).lean()
          ctx.forwardCache.set(forwardCacheKey, sarchForwardName)
        }

        // if (sarchForwardName.length === 0) {
        //   sarchForwardName = await ctx.db.User.find({
        //     $expr: { $eq: [quoteMessage.forward_sender_name, { $concat: ['$first_name', ' ', '$last_name'] }] }
        //   })
        // }
        if (sarchForwardName.length === 1) {
          messageFrom = {
            id: sarchForwardName[0].telegram_id,
            name: quoteMessage.forward_sender_name,
            username: sarchForwardName[0].username || null
          }

          let getHiddenChat

          getHiddenChat = await ctx.tdlib.getUser(messageFrom.id).catch(() => {})

          if (!getHiddenChat) {
            getHiddenChat = await ctx.tg.getChat(sarchForwardName[0].telegram_id).catch(console.error)
          }

          if (getHiddenChat) messageFrom = getHiddenChat
        } else {
          messageFrom = {
            id: hashCode(quoteMessage.forward_sender_name),
            name: quoteMessage.forward_sender_name
          }
        }
      } else {
        messageFrom = {
          id: hashCode(quoteMessage.forward_sender_name),
          name: quoteMessage.forward_sender_name
        }
      }
    } else if (quoteMessage.forward_from_chat) {
      messageFrom = quoteMessage.forward_from_chat
    } else if (quoteMessage.forward_from) {
      messageFrom = quoteMessage.forward_from
    } else if (quoteMessage.sender_chat) {
      messageFrom = {
        id: quoteMessage.sender_chat.id,
        name: quoteMessage.sender_chat.title,
        username: quoteMessage.sender_chat.username || null,
        photo: quoteMessage.sender_chat.photo
      }
    } else if (quoteMessage.from) {
      messageFrom = quoteMessage.from
    }

    if (messageFrom.title) messageFrom.name = messageFrom.title
    if (messageFrom.first_name) messageFrom.name = messageFrom.first_name
    if (messageFrom.last_name) messageFrom.name += ' ' + messageFrom.last_name

    let diffUser = true
    if (lastMessage && (messageFrom.id === lastMessage.from.id)) diffUser = false

    const message = {}

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
    }

    if (!text) {
      flag.media = true
      message.mediaCrop = flag.crop || false
    }
    if (flag.media && quoteMessage.photo) message.media = quoteMessage.photo
    if (flag.media && quoteMessage.sticker) {
      message.media = [quoteMessage.sticker]
      if (quoteMessage.sticker.is_video) {
        message.media = [quoteMessage.sticker.thumb]
      }
      message.mediaType = 'sticker'
    }
    if (flag.media && (quoteMessage.animation || quoteMessage.video)) {
      const { thumbnail } = quoteMessage.animation || quoteMessage.video
      message.media = [thumbnail]
    }
    if (flag.media && quoteMessage.voice) {
      message.voice = quoteMessage.voice
    }

    if (messageFrom.id) {
      message.chatId = messageFrom.id
    } else {
      message.chatId = hashCode(quoteMessage.from.name)
    }

    let avatarImage = true
    if (!diffUser || (ctx.me && ctx.me === quoteMessage.from.username && index > 0)) {
      avatarImage = false
      messageFrom.name = false
    }

    if (avatarImage) message.avatar = avatarImage
    if (messageFrom) message.from = messageFrom
    if (text) message.text = text

    if (!flag.privacy && message.from) {
      if (ctx.group && ctx.group.info.settings.privacy && !ctx.chat.username) {
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
      const replyMessageInfo = quoteMessage.reply_to_message
      if (replyMessageInfo.forward_from) {
        replyMessageInfo.from = replyMessageInfo.forward_from
      }
      if (replyMessageInfo.sender_chat) {
        message.replyMessage.name = replyMessageInfo.sender_chat.title
        if (replyMessageInfo.sender_chat.id) {
          message.replyMessage.chatId = replyMessageInfo.sender_chat.id
        } else {
          message.replyMessage.chatId = hashCode(message.replyMessage.name)
        }
      } else {
        if (replyMessageInfo.from.first_name) message.replyMessage.name = replyMessageInfo.from.first_name
        if (replyMessageInfo.from.last_name) message.replyMessage.name += ' ' + replyMessageInfo.from.last_name
        if (replyMessageInfo.from.id) {
          message.replyMessage.chatId = replyMessageInfo.from.id
        } else {
          message.replyMessage.chatId = hashCode(message.replyMessage.name)
        }
      }
      if (replyMessageInfo.text) message.replyMessage.text = replyMessageInfo.text
      if (replyMessageInfo.caption) message.replyMessage.text = replyMessageInfo.caption
      if (replyMessageInfo.entities) message.replyMessage.entities = replyMessageInfo.entities
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

    lastMessage = message
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

    const systemMessage = `You are a sarcastic and unfiltered group chat participant. Write in the language others use, default language is ${ctx.group?.info?.settings?.locale || 'fallback'}. Don't write like an AI. Copy the style and humor of chat examples. Match the meme style you see. Feel free to be edgy, use strong language, and be brutally honest when appropriate. Just write a hilarious text meme or joke about this topic. Keep it under 128 characters.

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

      if (quoteMessage.media) {
        try {
          const photo = quoteMessage.media.slice(-1)[0]
          const photoUrl = await ctx.telegram.getFileLink(photo.file_id)

          // Download the image with timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
          
          const response = await fetch(photoUrl, { 
            signal: controller.signal,
            timeout: 10000
          })
          clearTimeout(timeoutId)
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Get the file extension and determine media type
          const extension = photoUrl.toString().split('.').pop().toLowerCase()
          const validExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif']

          if (!validExtensions.includes(extension)) continue

          // Map file extensions to media types
          const mediaTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp',
            'gif': 'image/gif'
          }

          const mediaType = mediaTypes[extension]

          // Convert to base64
          const base64Data = buffer.toString('base64')

          userMessage = {
            role: 'user',
            content: [
              {
                type: 'text',
                text: (quoteMessage?.text?.slice(0, 128) || quoteMessage?.caption?.slice(0, 128) || '') + '\n[image]'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64Data}`,
                  detail: 'low'
                }
              }
            ]
          }
        } catch (error) {
          console.error('Error processing image:', error)
          // If image processing fails, fall back to text-only message
          userMessage = {
            role: 'user',
            content: '[Error processing image] ' + (quoteMessage?.text?.slice(0, 128) || quoteMessage?.caption?.slice(0, 128) || '[media]')
          }
        }
      }

      messageForAI.push(userMessage)
    }

    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash-preview',
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        ...messageForAI
      ],
      max_tokens: 150,
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
      return ctx.replyWithHTML(`😓 Sorry, AI busy. Try again later.`, {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      }).then((res) => {
        setTimeout(() => {
          ctx.deleteMessage(res.message_id)
        }, 5000)
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

  const generate = await got.post(
    `${quoteApiUri}/generate.webp?botToken=${process.env.BOT_TOKEN}`,
    {
      json: {
        type,
        format,
        backgroundColor,
        width,
        height,
        scale: flag.scale || scale,
        messages: quoteMessages,
        emojiBrand
      },
      responseType: 'buffer',
      timeout: {
        request: 30 * 1000 // 30 seconds
      },
      retry: {
        limit: 2,
        methods: ['POST'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524]
      }
    }
  ).catch((error) => handleQuoteError(ctx, error))

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
        let replyMarkup = {}

        if (ctx.group && (ctx.group.info.settings.rate || flag.rate)) {
          replyMarkup = Markup.inlineKeyboard([
            Markup.callbackButton('👍', 'rate:👍'),
            Markup.callbackButton('👎', 'rate:👎')
          ])
        }

        let sendResult

        if (flag.privacy) {
          sendResult = await ctx.replyWithSticker({
            source: image,
            filename: 'quote.webp'
          }, {
            emoji: emojis,
            reply_to_message_id: ctx.message.message_id,
            allow_sending_without_reply: true,
            reply_markup: replyMarkup,
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
              reply_markup: replyMarkup,
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
                  if (index > config.globalStickerSet.save_sticker_count - 1) {
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
              reply_markup: replyMarkup,
              business_connection_id: ctx.update?.business_message?.business_connection_id
            })
          }
        }

        if (sendResult && ctx.group && (ctx.group.info.settings.rate || flag.rate)) {
          // Use insertOne for better performance than save()
          await ctx.db.Quote.create({
            group: ctx.group.info,
            user: ctx.session.userInfo,
            file_id: sendResult.sticker.file_id,
            file_unique_id: sendResult.sticker.file_unique_id,
            rate: {
              votes: [
                { name: '👍', vote: [] },
                { name: '👎', vote: [] }
              ],
              score: 0
            }
          })
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

startClearStickerPack()

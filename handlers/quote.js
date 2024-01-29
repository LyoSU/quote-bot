const Markup = require('telegraf/markup')
const {
  tdlib
} = require('../helpers')
const Telegram = require('telegraf/telegram')
const fs = require('fs')
const got = require('got')
const { Configuration, OpenAIApi } = require("openai")
const EmojiDbLib = require('emoji-db')
const io = require('@pm2/io')

const emojiDb = new EmojiDbLib({ useDefaultDb: true })
const emojiArray = Object.values(emojiDb.dbData).filter(data => {
  if (data.emoji) return true
})

const quoteCountIO = io.meter({
  name: 'quote count',
  unit: 'quote'
})

const telegram = new Telegram(process.env.BOT_TOKEN)

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

const config = JSON.parse(fs.readFileSync('config/config.json', 'utf8'))

// for create global sticker pack
// telegram.createNewStickerSet(66478514, 'created_by_QuotLyBot', 'Created by @QuotLyBot', {
//   png_sticker: { source: 'placeholder.png' },
//   emojis: '💜'
// }).then(console.log)

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let botInfo

async function loopClearStickerPack () {
  if (!botInfo) botInfo = await telegram.getMe()

  setTimeout(async () => {
    const stickerSet = await telegram.getStickerSet(config.globalStickerSet.name + botInfo.username).catch((error) => {
      console.log('loopClearStickerPack getStickerSet error:', error)
    })
    if (!stickerSet) return
    for (const i in stickerSet.stickers) {
      const sticker = stickerSet.stickers[i]
      if (i > config.globalStickerSet.save_sticker_count - 1) {
        console.log(`deleting sticker ${stickerSet.stickers[i].file_id}`)
        await telegram.deleteStickerFromSet(sticker.file_id).catch((error) => {
          console.log('loopClearStickerPack deleteStickerFromSet error:', error)
        })
      }
    }
    loopClearStickerPack()
  }, 500)
}

loopClearStickerPack()

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

module.exports = async (ctx, next) => {
  quoteCountIO.mark()

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
    await sleep(1000)
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
  } else if (ctx.group && ctx.group.info.settings.quote.backgroundColor) {
    backgroundColor = ctx.group.info.settings.quote.backgroundColor
  } else if (ctx.session.userInfo.settings.quote.backgroundColor) {
    backgroundColor = ctx.session.userInfo.settings.quote.backgroundColor
  }

  if (!backgroundColor) {
    backgroundColor = '//#292232'
  }

  let emojiBrand = 'apple'
  if (ctx.group && ctx.group.info.settings.quote.emojiBrand) {
    emojiBrand = ctx.group.info.settings.quote.emojiBrand
  } else if (ctx.session.userInfo.settings.quote.emojiBrand) {
    emojiBrand = ctx.session.userInfo.settings.quote.emojiBrand
  }

  if ((ctx.group && ctx.group.info.settings.hidden) || ctx.session.userInfo.settings.hidden) flag.hidden = true


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

  messages.push(...await tdlib.getMessages(ctx.message.chat.id, (() => {
    const m = []
    for (let i = 0; i < messageCount; i++) {
      m.push(startMessage + i)
    }
    return m
  })()))

  messages = messages.filter((message) => message && Object.keys(message).length !== 0)

  if (messages.length <= 0) {
    if (process.env.GROUP_ID) {
      for (let index = 0; index < messageCount; index++) {
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

    if (quoteMessage.forward_sender_name) {
      if (flag.hidden) {
        const sarchForwardName = await ctx.db.User.find({
          full_name: quoteMessage.forward_sender_name
        })

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

          getHiddenChat = await tdlib.getUser(messageFrom.id).catch(() => {})

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
    } else if ([1087968824, 777000].includes(quoteMessage.from.id)) {
      /* 1087968824 is id of @GroupAnonymousBot. This part swaps anon bot data to the chat data */
      messageFrom = {
        id: quoteMessage.sender_chat.id,
        name: quoteMessage.sender_chat.title,
        username: quoteMessage.sender_chat.username || null,
        photo: quoteMessage.sender_chat.photo
      }
    } else {
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
    if (!diffUser || (ctx.me === quoteMessage.from.username && index > 0)) {
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
        const quotedFind = await ctx.db.User.findOne({ telegram_id: message.from.id })
        if (quotedFind && quotedFind.settings.privacy) flag.privacy = true
      }
    }

    message.replyMessage = {}
    if (flag.reply && quoteMessage.reply_to_message) {
      const replyMessageInfo = quoteMessage.reply_to_message
      if (replyMessageInfo.forward_from) {
        replyMessageInfo.from = replyMessageInfo.forward_from
      }
      if (replyMessageInfo.from.first_name) message.replyMessage.name = replyMessageInfo.from.first_name
      if (replyMessageInfo.from.last_name) message.replyMessage.name += ' ' + replyMessageInfo.from.last_name
      if (replyMessageInfo.from.id) {
        message.replyMessage.chatId = replyMessageInfo.from.id
      } else {
        message.replyMessage.chatId = hashCode(message.replyMessage.name)
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
    const messageForAI = [{
      role: 'system',
      content: `You are an active participant in a group chat.  Write only in the language used by other chat members. Don't write like an AI. Write in the style of messages that you see. Don't ask a question in your message. Just write a funny message related to the situation that was mentioned. Keep it under 128 characters. You can also use emojis 😉.`
    }]

    for (const index in quoteMessages) {
      const quoteMessage = quoteMessages[index]

      messageForAI.push({
        role: 'user',
        content: quoteMessage?.text || quoteMessage.caption || (quoteMessage.mediaType === 'sticker' ? '[user sent a sticker]' : '[user sent a media]')
      })
    }

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messageForAI,
      max_tokens: 64,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.6
    }).catch((err) => {
      console.error('OpenAI error:', err?.response?.statusText || err.message)
    })

    if (completion?.data?.choices && completion.data.choices[0]) {
      const message = completion.data.choices[0].message.content

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
        text: message,
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
      timeout: 1000 * 30,
      retry: 1
    }
  ).catch((error) => {
    return { error }
  })

  if (generate.error) {
    if (generate.error.response && generate.error.response.body) {
      const errorMessage = JSON.parse(generate.error.response.body).error.message

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

  let emojis = ctx.group ? ctx.group.info.settings.quote.emojiSuffix : ctx.session.userInfo.settings.quote.emojiSuffix
  if (!emojis || emojis === 'random') {
    emojis = quoteEmojis + emojiArray[Math.floor(Math.random() * emojiArray.length)].emoji
  } else {
    emojis += quoteEmojis
  }

  emojis = `${emojis}💜`

  if (generate.body) {
    const image = generate.body
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
          reply_markup: replyMarkup
        })
      } else {
        if (!ctx.session.userInfo.tempStickerSet.create) {
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

        if (ctx.session.userInfo.tempStickerSet.create && ctx.update.update_id % 5 === 0) {
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
            reply_markup: replyMarkup
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
            sticketSet.stickers.forEach(async (sticker, index) => {
              // wait 3 seconds before delete sticker
              await new Promise((resolve) => setTimeout(resolve, 3000))

              if (index > config.globalStickerSet.save_sticker_count - 1) {
                telegram.deleteStickerFromSet(sticker.file_id).catch(() => {})
              }
            })
          }

          sendResult = await ctx.replyWithSticker(sticketSet.stickers[sticketSet.stickers.length - 1].file_id, {
            reply_to_message_id: ctx.message.message_id,
            allow_sending_without_reply: true,
            reply_markup: replyMarkup
          })
        }
      }

      if (sendResult && ctx.group && (ctx.group.info.settings.rate || flag.rate)) {
        const quoteDb = new ctx.db.Quote()
        quoteDb.group = ctx.group.info
        quoteDb.user = ctx.session.userInfo
        quoteDb.file_id = sendResult.sticker.file_id
        quoteDb.file_unique_id = sendResult.sticker.file_unique_id
        quoteDb.rate = {
          votes: [
            {
              name: '👍',
              vote: []
            },
            {
              name: '👎',
              vote: []
            }
          ],
          score: 0
        }

        await quoteDb.save()
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
      await ctx.replyWithDocument({
        source: image,
        filename: 'quote.png'
      }, {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      })
    }
  }
}

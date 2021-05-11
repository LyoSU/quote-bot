const Markup = require('telegraf/markup')
const {
  tdlib
} = require('../helpers')
const Telegram = require('telegraf/telegram')
const fs = require('fs')
const got = require('got')
const io = require('@pm2/io')

const quoteCountIO = io.meter({
  name: 'quote count',
  unit: 'quote'
})

const telegram = new Telegram(process.env.BOT_TOKEN)

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))

// for create global sticker pack
// telegram.createNewStickerSet(66478514, 'created_by_QuotLyBot', 'Created by @QuotLyBot', {
//   png_sticker: { source: 'placeholder.png' },
//   emojis: '💜'
// }).then(console.log)

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function loopClearStickerPack () {
  setInterval(async () => {
    await telegram.getStickerSet(config.globalStickerSet.name).then(async (sticketSet) => {
      for (const i in sticketSet.stickers) {
        const sticker = sticketSet.stickers[i]
        if (i > config.globalStickerSet.save_sticker_count - 1) {
          telegram.deleteStickerFromSet(sticker.file_id).catch(() => {
          })
        }
      }
    })
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

module.exports = async (ctx) => {
  quoteCountIO.mark()
  await ctx.replyWithChatAction('upload_photo')
  if (ctx.chat.type === 'private') await sleep(100)

  const flag = {
    count: false,
    reply: false,
    png: false,
    img: false,
    rate: false,
    color: false,
    scale: false,
    privacy: false
  }

  if (ctx.message && ctx.message.text && ctx.message.text.match(/\/q/)) {
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
    flag.color = args.find((arg) => (!Object.values(flag).find((f) => arg === f)))

    if (flag.scale) flag.scale = flag.scale.match(/s([+-]?(?:\d*\.)?\d+)/)[1]
  }

  // set background color
  let backgroundColor

  if (flag.color) {
    if (flag.color === 'random') {
      backgroundColor = generateRandomColor()
    } else {
      backgroundColor = flag.color
    }
  } else if (ctx.group && ctx.group.info.settings.quote.backgroundColor) {
    backgroundColor = ctx.group.info.settings.quote.backgroundColor
  } else if (ctx.session.userInfo.settings.quote.backgroundColor) {
    backgroundColor = ctx.session.userInfo.settings.quote.backgroundColor
  } else {
    backgroundColor = '#1b1429'
  }

  if ((ctx.group && ctx.group.info.settings.hidden) || ctx.session.userInfo.settings.hidden) flag.hidden = true

  const maxQuoteMessage = 30
  let messageCount = flag.count || 1

  let quoteMessage = ctx.message.reply_to_message
  if (!quoteMessage && ctx.chat.type === 'private') {
    quoteMessage = ctx.message
    messageCount = maxQuoteMessage
  }

  messageCount = Math.min(messageCount, maxQuoteMessage)

  if (!quoteMessage) {
    return ctx.replyWithHTML(ctx.i18n.t('quote.empty_forward'), {
      reply_to_message_id: ctx.message.message_id
    })
  }

  const quoteMessages = []

  const startMessage = quoteMessage.message_id
  let lastMessage
  for (let index = 0; index < messageCount; index++) {
    try {
      const getMessages = await tdlib.getMessages(ctx.message.chat.id, [startMessage + index])
      if (getMessages.length > 0 && getMessages[0].message_id) {
        quoteMessage = getMessages[0]
      } else {
        if (index > 0) {
          if (process.env.GROUP_ID) {
            const chatForward = process.env.GROUP_ID
            quoteMessage = await ctx.telegram.forwardMessage(chatForward, ctx.message.chat.id, startMessage + index)
          } else {
            quoteMessage = null
          }
        }
      }
    } catch (error) {
      console.error(error)
      quoteMessage = null
    }

    // if (index === 0) quoteMessage = ctx.message

    if (ctx.chat.type === 'private' && !quoteMessage) break

    if (!quoteMessage) {
      continue
    }

    let messageFrom

    if (quoteMessage.forward_sender_name) {
      if (flag.hidden) {
        let sarchForwardName

        sarchForwardName = await ctx.db.User.find({
          full_name: quoteMessage.forward_sender_name
        })

        if (sarchForwardName.length === 0) {
          sarchForwardName = await ctx.db.User.find({
            $expr: { $eq: [quoteMessage.forward_sender_name, { $concat: ['$first_name', ' ', '$last_name'] }] }
          })
        }

        if (sarchForwardName.length === 0) {
          sarchForwardName = await ctx.db.User.find({
            first_name: quoteMessage.forward_sender_name
          })
        }

        if (sarchForwardName.length === 1) {
          messageFrom = {
            id: sarchForwardName[0].telegram_id,
            name: quoteMessage.forward_sender_name,
            username: sarchForwardName[0].username || null
          }

          const getHiddenChat = await ctx.tg.getChat(sarchForwardName[0].telegram_id).catch(console.error)
          if (getHiddenChat) messageFrom.photo = getHiddenChat.photo
        } else {
          messageFrom = {
            id: hashCode(quoteMessage.forward_sender_name),
            name: quoteMessage.forward_sender_name,
            username: 'HiddenSender'
          }
        }
      } else {
        messageFrom = {
          id: hashCode(quoteMessage.forward_sender_name),
          name: quoteMessage.forward_sender_name,
          username: 'HiddenSender'
        }
      }
    } else if (quoteMessage.forward_from_chat) {
      messageFrom = {
        id: quoteMessage.forward_from_chat.id,
        name: quoteMessage.forward_from_chat.title,
        username: quoteMessage.forward_from_chat.username || null,
        photo: quoteMessage.forward_from_chat.photo
      }
    } else if (quoteMessage.forward_from) {
      messageFrom = quoteMessage.forward_from
    } else if (quoteMessage.from.id === 1087968824) {
      /* 1087968824 is id of @GroupAnonymousBot. This part swaps anon bot data to the chat data */
      messageFrom = {
        id: quoteMessage.chat.id,
        name: quoteMessage.chat.title,
        username: quoteMessage.chat.username || null,
        photo: quoteMessage.chat.photo
      }
    } else {
      messageFrom = quoteMessage.from
    }

    if (messageFrom.first_name) messageFrom.name = messageFrom.first_name
    if (messageFrom.last_name) messageFrom.name += ' ' + messageFrom.last_name

    quoteMessage.from = messageFrom

    let diffUser = true
    if (lastMessage && (quoteMessage.from.id === lastMessage.from.id)) diffUser = false

    const message = {}

    let text

    if (quoteMessage.caption) {
      text = quoteMessage.caption
      message.entities = quoteMessage.caption_entities
    } else {
      text = quoteMessage.text
      message.entities = quoteMessage.entities
    }

    if (!text) flag.media = true
    if (flag.media && quoteMessage.photo) message.media = quoteMessage.photo
    if (flag.media && quoteMessage.sticker) {
      message.media = [quoteMessage.sticker]
      message.mediaType = 'sticker'
    }

    if (messageFrom.id) {
      message.chatId = messageFrom.id
    } else {
      message.chatId = hashCode(quoteMessage.from.name)
    }

    let avatarImage = true
    if (!diffUser || (ctx.me === quoteMessage.from.username && index > 0)) {
      avatarImage = false
      quoteMessage.from.name = false
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
      if (replyMessageInfo.from.first_name) message.replyMessage.name = replyMessageInfo.from.first_name
      if (replyMessageInfo.from.last_name) message.replyMessage.name += ' ' + replyMessageInfo.from.last_name
      if (replyMessageInfo.from.id) {
        message.replyMessage.chatId = replyMessageInfo.from.id
      } else {
        message.replyMessage.chatId = hashCode(message.replyMessage.name)
      }
      if (replyMessageInfo.text) message.replyMessage.text = replyMessageInfo.text
      if (replyMessageInfo.caption) message.replyMessage.text = replyMessageInfo.caption
    }

    quoteMessages[index] = message

    lastMessage = quoteMessage
  }

  if (quoteMessages.length < 1) {
    return ctx.replyWithHTML(ctx.i18n.t('quote.empty_forward'), {
      reply_to_message_id: ctx.message.message_id
    })
  }

  let width = 512
  let height = 512 * 1.5
  let scale = 2

  if (flag.png || flag.img) {
    width *= 1.5
    height *= 5
    scale *= 1.5
  }

  let type = 'quote'

  if (flag.img) type = 'image'
  if (flag.png) type = 'png'

  let format
  if (!flag.privacy && type === 'quote') format = 'png'

  const generate = await got.post(`${process.env.QUOTE_API_URI}/generate`, {
    json: {
      type,
      format,
      backgroundColor,
      width,
      height,
      scale: flag.scale || scale,
      messages: quoteMessages
    },
    timeout: 1000 * 15,
    retry: 1
  }).json().catch((error) => {
    return { error }
  })

  if (generate.error) {
    if (generate.error.response && generate.error.response.body) {
      const errorMessage = JSON.parse(generate.error.response.body).error.message

      return ctx.replyWithHTML(ctx.i18n.t('quote.api_error', {
        error: errorMessage
      }), {
        reply_to_message_id: ctx.message.message_id
      })
    } else {
      console.error(generate.error)
      return ctx.replyWithHTML(ctx.i18n.t('quote.api_error', {
        error: 'quote_api_down'
      }), {
        reply_to_message_id: ctx.message.message_id
      })
    }
  }

  if (generate.result.image) {
    // eslint-disable-next-line node/no-deprecated-api
    const image = new Buffer(generate.result.image, 'base64')
    if (generate.result.type === 'quote') {
      let replyMarkup = {}

      if (ctx.group && (ctx.group.info.settings.rate || flag.rate)) {
        replyMarkup = Markup.inlineKeyboard([
          Markup.callbackButton('👍', 'rate:👍'),
          Markup.callbackButton('👎', 'rate:👎')
        ])
      }

      let sendResult

      if (flag.privacy) {
        sendResult = await ctx.replyWithDocument({
          source: image,
          filename: 'quote.webp'
        }, {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: replyMarkup
        })
      } else {
        if (!ctx.session.userInfo.tempStickerSet.create) {
          const getMe = await telegram.getMe()

          const packName = `temp_${Math.random().toString(36).substring(5)}_${Math.abs(ctx.from.id)}_by_${getMe.username}`
          const packTitle = `Created by @${getMe.username}`

          const created = await telegram.createNewStickerSet(ctx.from.id, packName, packTitle, {
            png_sticker: { source: 'placeholder.png' },
            emojis: '💜'
          }).catch(() => {
          })

          ctx.session.userInfo.tempStickerSet.name = packName
          ctx.session.userInfo.tempStickerSet.create = created
        }

        let packOwnerId = config.globalStickerSet.ownerId
        let packName = config.globalStickerSet.name

        if (ctx.session.userInfo.tempStickerSet.create) {
          packOwnerId = ctx.from.id
          packName = ctx.session.userInfo.tempStickerSet.name
        }

        const addSticker = await ctx.tg.addStickerToSet(packOwnerId, packName, {
          png_sticker: { source: image },
          emojis: '💜'
        }, true).catch((error) => {
          console.error(error)
          if (error.description === 'Bad Request: STICKERSET_INVALID') {
            ctx.session.userInfo.tempStickerSet.create = false
          }
        })

        if (addSticker) {
          const sticketSet = await ctx.getStickerSet(packName)

          if (ctx.session.userInfo.tempStickerSet.create) {
            for (const i in sticketSet.stickers) {
              const sticker = sticketSet.stickers[i]
              if (i > config.globalStickerSet.save_sticker_count - 1) {
                telegram.deleteStickerFromSet(sticker.file_id).catch(() => {
                })
              }
            }
          }

          sendResult = await ctx.replyWithDocument(sticketSet.stickers[sticketSet.stickers.length - 1].file_id, {
            reply_to_message_id: ctx.message.message_id,
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
    } else if (generate.result.type === 'image') {
      await ctx.replyWithPhoto({
        source: image,
        filename: 'quote.png'
      }, {
        reply_to_message_id: ctx.message.message_id
      })
    } else {
      await ctx.replyWithDocument({
        source: image,
        filename: 'quote.png'
      }, {
        reply_to_message_id: ctx.message.message_id
      })
    }
  }
}

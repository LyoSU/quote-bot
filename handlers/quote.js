const Markup = require('telegraf/markup')
const {
  loadCanvasImage,
  generateQuote
} = require('../utils')
const {
  tdlib
} = require('../helpers')
const { createCanvas } = require('canvas')
const sharp = require('sharp')

const { Telegram } = require('telegraf')
const LRU = require('lru-cache')

const telegram = new Telegram(process.env.BOT_TOKEN)
const avatarCache = new LRU({
  max: 20,
  maxAge: 1000 * 60 * 5
})

const downloadAvatarImage = async (userId, username) => {
  let avatarImage

  const avatarImageCache = avatarCache.get(userId)

  if (avatarImageCache) {
    avatarImage = avatarImageCache
  } else {
    try {
      let userPhoto
      let userPhotoUrl = './assets/404.png'

      const getChat = await telegram.getChat(userId).catch(() => {})
      if (getChat && getChat.photo && getChat.photo.small_file_id) userPhoto = getChat.photo.small_file_id

      if (userPhoto) userPhotoUrl = await telegram.getFileLink(userPhoto)
      else if (username) userPhotoUrl = `https://telega.one/i/userpic/320/${username}.jpg`

      avatarImage = await loadCanvasImage(userPhotoUrl)

      avatarCache.set(userId, avatarImage)
    } catch (error) {
      avatarImage = await loadCanvasImage('./assets/404.png')
    }
  }

  return avatarImage
}

// https://codepen.io/jreyesgs/pen/yadmge
const addLight = (color, amount) => {
  const cc = parseInt(color, 16) + amount
  let c = (cc > 255) ? 255 : (cc)
  c = (c.toString(16).length > 1) ? c.toString(16) : `0${c.toString(16)}`
  return c
}

const lighten = (color, amount) => {
  color = (color.indexOf('#') >= 0) ? color.substring(1, color.length) : color
  amount = parseInt((255 * amount) / 100)
  color = `#${addLight(color.substring(0, 2), amount)}${addLight(color.substring(2, 4), amount)}${addLight(color.substring(4, 6), amount)}`

  return color
}

const normalizeColor = (color) => {
  const canvas = createCanvas(0, 0)
  const canvasCtx = canvas.getContext('2d')

  canvasCtx.fillStyle = color
  color = canvasCtx.fillStyle

  return color
}

module.exports = async (ctx) => {
  ctx.replyWithChatAction('upload_photo')

  const flag = {
    count: false,
    reply: false,
    png: false,
    img: false,
    color: false,
    rate: false
  }

  if (ctx.message && ctx.message.text && ctx.message.text.match(/\/q/)) {
    const args = ctx.message.text.split(' ')
    args.splice(0, 1)

    flag.count = args.filter(arg => !isNaN(parseInt(arg)))[0]
    flag.reply = args.filter(arg => ['r', 'reply'].includes(arg))[0]
    flag.png = args.filter(arg => ['p', 'png'].includes(arg))[0]
    flag.img = args.filter(arg => ['i', 'img'].includes(arg))[0]
    flag.rate = args.filter(arg => ['rate'].includes(arg))[0]
    flag.color = args.filter(arg => (arg !== flag.count && arg !== flag.reply && arg !== flag.png && arg !== flag.img))[0]
  }

  // set background color
  let backgroundColor = '#130f1c'

  if (ctx.session.userInfo.settings.quote.backgroundColor) backgroundColor = ctx.session.userInfo.settings.quote.backgroundColor
  if (ctx.group && ctx.group.info.settings.quote.backgroundColor) backgroundColor = ctx.group.info.settings.quote.backgroundColor

  let colorName
  if (flag.color) {
    colorName = flag.color
    if (flag.color[0] === '#') colorName = colorName.substr(1)
  }

  if ((ctx.match && colorName === 'random') || backgroundColor === 'random') backgroundColor = `#${(Math.floor(Math.random() * 16777216)).toString(16)}`
  else if (colorName && flag.color[0] === '#') backgroundColor = `#${colorName}`
  else if (colorName) backgroundColor = `${colorName}`

  backgroundColor = normalizeColor(backgroundColor)

  const maxQuoteMessage = 30
  let messageCount = 1
  if (flag.count) messageCount = flag.count

  let quoteMessage = ctx.message.reply_to_message
  if (!quoteMessage && ctx.chat.type === 'private') {
    quoteMessage = ctx.message
    messageCount = maxQuoteMessage
  }

  if (messageCount > maxQuoteMessage) messageCount = maxQuoteMessage

  if (quoteMessage) {
    const quoteMessages = []
    const quoteImages = []

    const startMessage = quoteMessage.message_id
    let lastMessage

    for (let index = 0; index < messageCount; index++) {
      if (index > -1) {
        try {
          const getMessages = await tdlib.getMessages(ctx.message.chat.id, [startMessage + index]).catch(() => {})
          if (getMessages.length > 0 && getMessages[0].message_id) {
            quoteMessage = getMessages[0]
          } else {
            if (index > 0) {
              let chatForward = ctx.message.chat.id
              if (process.env.GROUP_ID) chatForward = process.env.GROUP_ID
              quoteMessage = await ctx.telegram.forwardMessage(chatForward, ctx.message.chat.id, startMessage + index)
              if (!process.env.GROUP_ID) ctx.telegram.deleteMessage(ctx.message.chat.id, quoteMessage.message_id)
            }
          }
        } catch (error) {
          quoteMessage = null
        }

        if (ctx.chat.type === 'private' && !quoteMessage) break
      }

      if (quoteMessage && (quoteMessage.text || quoteMessage.caption)) {
        let text, entities

        if (quoteMessage) quoteMessages[index] = quoteMessage

        if (quoteMessage.caption) {
          text = quoteMessage.caption
          entities = quoteMessage.caption_entities
        } else {
          text = quoteMessage.text
          entities = quoteMessage.entities
        }

        let messageFrom = quoteMessage.from

        if (quoteMessage.forward_from) messageFrom = quoteMessage.forward_from

        if (quoteMessage.forward_sender_name) {
          messageFrom = {
            id: 0,
            name: quoteMessage.forward_sender_name,
            username: 'HiddenSender'
          }
        } else if (quoteMessage.forward_from_chat) {
          messageFrom = {
            id: quoteMessage.forward_from_chat.id,
            name: quoteMessage.forward_from_chat.title,
            username: quoteMessage.forward_from_chat.username || null
          }
        }

        // if (messageFrom.id === 0) {
        //   let sarchForwardName

        //   sarchForwardName = await ctx.db.User.findOne({
        //     $expr: { $eq: [messageFrom.name, { $concat: ['$first_name', ' ', '$last_name'] }] }
        //   })

        //   if (!sarchForwardName) {
        //     sarchForwardName = await ctx.db.User.findOne({
        //       first_name: messageFrom.name
        //     })
        //   }

        //   if (sarchForwardName) {
        //     messageFrom.id = sarchForwardName.telegram_id
        //     messageFrom.username = sarchForwardName.username || null
        //   }
        // }

        if (messageFrom.first_name) messageFrom.name = messageFrom.first_name
        if (messageFrom.last_name) messageFrom.name += ' ' + messageFrom.last_name

        quoteMessage.from = messageFrom

        let diffUser = true
        if (lastMessage && (quoteMessage.from.name === lastMessage.from.name)) diffUser = false

        let name
        let avatarImage
        if (diffUser) {
          name = quoteMessages[index].from.name
          avatarImage = await downloadAvatarImage(messageFrom.id, messageFrom.username)
        }

        const message = {}

        if (messageFrom.id) message.chatId = messageFrom.id
        else message.chatId = 0
        if (avatarImage) message.avatar = avatarImage
        if (name) message.name = name
        if (text) message.text = text

        const replyMessage = {}
        if (flag.reply && quoteMessage.reply_to_message) {
          const replyMessageInfo = quoteMessage.reply_to_message
          if (replyMessageInfo.from.id) replyMessage.chatId = replyMessageInfo.from.id
          else replyMessage.chatId = 0
          if (replyMessageInfo.from.first_name) replyMessage.name = replyMessageInfo.from.first_name
          if (replyMessageInfo.from.last_name) replyMessage.name += ' ' + replyMessageInfo.from.last_name
          if (replyMessageInfo.text) replyMessage.text = replyMessageInfo.text
          if (replyMessageInfo.caption) replyMessage.text = replyMessageInfo.caption
        }

        let width = 512
        let height = 512 * 1.5

        if (flag.png || flag.img) {
          width *= 1.5
          height *= 5
        }

        console.log('start generate quote')
        const canvasQuote = await generateQuote(backgroundColor, message, replyMessage, entities, width, height)

        quoteImages.push(canvasQuote)
        lastMessage = quoteMessage
      }
    }

    if (quoteImages.length > 0) {
      let canvasQuote

      if (quoteImages.length > 1) {
        let width = 0
        let height = 0

        for (let index = 0; index < quoteImages.length; index++) {
          if (quoteImages[index].width > width) width = quoteImages[index].width
          height += quoteImages[index].height
        }

        const quoteMargin = 5

        const canvas = createCanvas(width, height + (quoteMargin * quoteImages.length))
        const canvasCtx = canvas.getContext('2d')

        let imageY = 0

        for (let index = 0; index < quoteImages.length; index++) {
          canvasCtx.drawImage(quoteImages[index], 0, imageY)
          imageY += quoteImages[index].height + quoteMargin
        }
        canvasQuote = canvas
      } else {
        canvasQuote = quoteImages[0]
      }

      if (!flag.img && canvasQuote.height > 1024 * 3) flag.png = true

      if (flag.png || flag.img) {
        if (flag.png) {
          await ctx.replyWithDocument({
            source: canvasQuote.toBuffer(),
            filename: 'quote.png'
          }, {
            reply_to_message_id: ctx.message.message_id
          })
        } else {
          const padding = 25

          const canvasImage = await loadCanvasImage(canvasQuote.toBuffer())

          const canvasPic = createCanvas(canvasImage.width + padding * 2, canvasImage.height + padding * 2)
          const canvasPicCtx = canvasPic.getContext('2d')

          canvasPicCtx.fillStyle = lighten(backgroundColor, 20)
          canvasPicCtx.fillRect(0, 0, canvasPic.width + padding, canvasPic.height + padding)

          const canvasPatternImage = await loadCanvasImage('./assets/pattern_02.png')
          // const canvasPatternImage = await loadCanvasImage('./assets/pattern_ny.png')

          const pattern = canvasPicCtx.createPattern(canvasPatternImage, 'repeat')
          canvasPicCtx.fillStyle = pattern
          canvasPicCtx.fillRect(0, 0, canvasPic.width, canvasPic.height)

          canvasPicCtx.drawImage(canvasImage, padding, padding)

          const quoteImage = await sharp(canvasPic.toBuffer()).png({ lossless: true, force: true }).toBuffer()

          ctx.replyWithPhoto({
            source: quoteImage,
            filename: 'quote.png'
          }, {
            reply_to_message_id: ctx.message.message_id
          })
        }
      } else {
        const downPadding = 75
        const maxWidth = 512
        const maxHeight = 512

        const imageQuoteSharp = sharp(canvasQuote.toBuffer())

        if (canvasQuote.height > canvasQuote.width) imageQuoteSharp.resize({ height: maxHeight })
        else imageQuoteSharp.resize({ width: maxWidth })

        const canvasImage = await loadCanvasImage(await imageQuoteSharp.toBuffer())

        const canvasPadding = createCanvas(canvasImage.width, canvasImage.height + downPadding)
        const canvasPaddingCtx = canvasPadding.getContext('2d')

        canvasPaddingCtx.drawImage(canvasImage, 0, 0)

        const quoteImage = await sharp(canvasPadding.toBuffer()).webp({ lossless: true, force: true }).toBuffer()

        let replyMarkup = {}

        if (ctx.group && (ctx.group.info.settings.rate || flag.rate)) {
          replyMarkup = Markup.inlineKeyboard([
            Markup.callbackButton('👍', 'rate:👍'),
            Markup.callbackButton('👎', 'rate:👎')
          ])
        }

        const sendResult = await ctx.replyWithDocument({
          source: quoteImage,
          filename: 'quote.webp'
        }, {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: replyMarkup
        })

        if (ctx.group && (ctx.group.info.settings.rate || flag.rate)) {
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
      }
    } else {
      ctx.replyWithHTML(ctx.i18n.t('quote.empty_forward'), {
        reply_to_message_id: ctx.message.message_id
      })
    }
  } else {
    ctx.replyWithHTML(ctx.i18n.t('quote.empty_forward'), {
      reply_to_message_id: ctx.message.message_id
    })
  }
}

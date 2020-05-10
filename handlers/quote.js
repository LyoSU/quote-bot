const Markup = require('telegraf/markup')
const {
  tdlib
} = require('../helpers')
const got = require('got')

const hashCode = function (s) {
  let h = 0; var l = s.length; var i = 0
  if (l > 0) {
    while (i < l) { h = (h << 5) - h + s.charCodeAt(i++) | 0 }
  }
  return h
}

const generateRandomColor = () => {
  const rawColor = (Math.floor(Math.random() * 16777216)).toString(16)
  const color = '0'.repeat(6 - rawColor.length) + rawColor
  return `#${color}`
}

module.exports = async (ctx) => {
  await ctx.replyWithChatAction('upload_photo')

  const flag = {
    count: false,
    reply: false,
    png: false,
    img: false,
    rate: false,
    color: false,
    scale: false
  }

  if (ctx.message && ctx.message.text && ctx.message.text.match(/\/q/)) {
    const args = ctx.message.text.split(' ')
    args.splice(0, 1)

    flag.count = args.find((arg) => !isNaN(parseInt(arg)))
    flag.reply = args.find((arg) => ['r', 'reply'].includes(arg))
    flag.png = args.find((arg) => ['p', 'png'].includes(arg))
    flag.img = args.find((arg) => ['i', 'img'].includes(arg))
    flag.rate = args.find((arg) => ['rate'].includes(arg))
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
    backgroundColor = '#130f1c'
  }

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
  const quoteImages = []

  const startMessage = quoteMessage.message_id
  let lastMessage

  for (let index = 0; index < messageCount; index++) {
    try {
      const getMessages = await tdlib.getMessages(ctx.message.chat.id, [startMessage + index]).catch(() => {})
      if (getMessages.length > 0 && getMessages[0].message_id) {
        quoteMessage = getMessages[0]
      } else {
        if (index > 0) {
          let chatForward = ctx.message.chat.id
          if (process.env.GROUP_ID) chatForward = process.env.GROUP_ID
          quoteMessage = await ctx.telegram.forwardMessage(chatForward, ctx.message.chat.id, startMessage + index)
          if (!process.env.GROUP_ID) await ctx.telegram.deleteMessage(ctx.message.chat.id, quoteMessage.message_id)
        }
      }
    } catch (error) {
      quoteMessage = null
    }

    if (ctx.chat.type === 'private' && !quoteMessage) break

    if (!quoteMessage) {
      continue
    }

    if (quoteMessage.text || quoteMessage.caption) {
      let text, entities

      if (quoteMessage.caption) {
        text = quoteMessage.caption
        entities = quoteMessage.caption_entities
      } else {
        text = quoteMessage.text
        entities = quoteMessage.entities
      }

      let messageFrom

      if (quoteMessage.forward_sender_name) {
        messageFrom = {
          id: hashCode(quoteMessage.forward_sender_name),
          name: quoteMessage.forward_sender_name,
          username: 'HiddenSender'
        }
      } else if (quoteMessage.forward_from_chat) {
        messageFrom = {
          id: quoteMessage.forward_from_chat.id,
          name: quoteMessage.forward_from_chat.title,
          username: quoteMessage.forward_from_chat.username || null
        }
      } else if (quoteMessage.forward_from) {
        messageFrom = quoteMessage.forward_from
      } else {
        messageFrom = quoteMessage.from
      }

      // // поиск юзера у которых скрыт форвард по имени (отключено)
      // if (messageFrom.id == message) {
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

      const message = {}

      if (messageFrom.id) message.chatId = messageFrom.id
      else message.chatId = hashCode(quoteMessage.from.name)

      let avatarImage = false
      if (diffUser) {
        avatarImage = true
      } else {
        quoteMessage.from.name = false
      }

      if (avatarImage) message.avatar = avatarImage
      if (messageFrom) message.from = messageFrom
      if (text) message.text = text

      const replyMessage = {}
      if (flag.reply && quoteMessage.reply_to_message) {
        const replyMessageInfo = quoteMessage.reply_to_message
        if (replyMessageInfo.from.first_name) replyMessage.name = replyMessageInfo.from.first_name
        if (replyMessageInfo.from.last_name) replyMessage.name += ' ' + replyMessageInfo.from.last_name
        if (replyMessageInfo.from.id) replyMessage.chatId = replyMessageInfo.from.id
        else replyMessage.chatId = hashCode(replyMessage.name)
        if (replyMessageInfo.text) replyMessage.text = replyMessageInfo.text
        if (replyMessageInfo.caption) replyMessage.text = replyMessageInfo.caption
      }

      quoteMessages[index] = {
        message,
        replyMessage,
        entities
      }

      // quoteImages.push(canvasQuote)
      lastMessage = quoteMessage
    }
  }

  if (quoteMessages.length < 1) {
    if (quoteImages.length === 0) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.empty_forward'), {
        reply_to_message_id: ctx.message.message_id
      })
    }
  }

  const width = 512
  const height = 512 * 1.5

  let type = 'quote'

  if (flag.img) type = 'image'
  if (flag.png) type = 'png'

  const quoteImage = await got.post(`${process.env.QUOTE_API_URI}/generate`, {
    json: {
      type,
      backgroundColor,
      width,
      height,
      scale: flag.scale || 2,
      messages: quoteMessages
    }
  }).buffer().catch((error) => {
    const errorMessage = JSON.parse(error.response.body).error
    console.error(errorMessage)

    ctx.replyWithHTML(ctx.i18n.t('quote.empty_forward'), {
      reply_to_message_id: ctx.message.message_id
    })

    return false
  })

  if (quoteImage) {
    if (flag.png) {
      await ctx.replyWithDocument({
        source: quoteImage,
        filename: 'quote.png'
      }, {
        reply_to_message_id: ctx.message.message_id
      })
    } else if (flag.img) {
      await ctx.replyWithPhoto({
        source: quoteImage,
        filename: 'quote.png'
      }, {
        reply_to_message_id: ctx.message.message_id
      })
    } else {
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
  }
}

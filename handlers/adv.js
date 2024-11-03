const { Composer } = require('grammy')
const path = require('path')
const mongoose = require('mongoose')
const enot = require('enot-node')
const { InlineKeyboard } = require('grammy')
const { I18n } = require('@grammyjs/i18n')
const { conversations, createConversation } = require('@grammyjs/conversations')
const { onlyPm } = require('../middlewares')
const { db } = require('../database')

const i18n = new I18n({
  directory: path.resolve(__dirname, '../locales'),
  defaultLanguage: false
})

// Helper functions stay the same
const freeKassaGenerate = (params, world) => {
  if (!params || !world || typeof params !== 'object') {
    throw new Error('Missing params and secret world')
  }

  const result = {}
  const paramsArr = []
  let url = 'https://pay.freekassa.ru/?'

  params = JSON.parse(JSON.stringify(params))

  if (params.oa) {
    params.oa = parseFloat(params.oa).toString()
  }

  if (params.m && params.oa && params.o && params.currency) {
    paramsArr.push(params.m)
    paramsArr.push(params.oa)
    paramsArr.push(world)
    paramsArr.push(params.currency)
    paramsArr.push(params.o)
  } else if (params.MERCHANT_ID && params.AMOUNT && params.MERCHANT_ORDER_ID) {
    paramsArr.push(params.MERCHANT_ID)
    paramsArr.push(params.AMOUNT)
    paramsArr.push(world)
    paramsArr.push(params.MERCHANT_ORDER_ID)
    return {
      signature: require('crypto')
        .createHash('md5')
        .update(paramsArr.join(':'))
        .digest('hex')
    }
  } else {
    throw new Error('Required parameters are not specified')
  }

  result.signature = require('crypto')
    .createHash('md5')
    .update(paramsArr.join(':'))
    .digest('hex')

  params.s = result.signature

  Object.keys(params).forEach(function (p) {
    url += p + '=' + encodeURIComponent(params[p]) + '&'
  })

  result.url = url

  return result
}

const checkPaymentStatus = async () => {
  const session = await db.connection.startSession()

  await session.withTransaction(async () => {
    const invoices = await db.Invoice.find({ status: 1 }).populate('user').session(session)

    for (const invoice of invoices) {
      if (!invoice.$session()) return null
      invoice.status = 2
      await invoice.save()
      invoice.user.adv.credit += invoice.amount
      await invoice.user.save()
    }
  })

  session.endSession()
}
// setInterval(checkPaymentStatus, 1000 * 10)

// Convert main scene to conversation
async function advMainConversation(conversation, ctx) {
  const userInfo = await db.User.findById(ctx.session.userInfo)

  const keyboard = new InlineKeyboard()
    .text(ctx.i18n.t('adv.main_menu.create_btn'), 'adv:create')
    .row()
    .text(ctx.i18n.t('adv.main_menu.list_btn'), 'adv:list')
    .row()
    .text(ctx.i18n.t('adv.main_menu.pay_btn'), 'adv:pay')

  await ctx.reply(ctx.i18n.t('adv.about', {
    balance: (userInfo.adv.credit / 100).toFixed(2)
  }), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
    reply_to_message_id: ctx.msg.message_id
  })
}

// Convert advertisement creation flow to conversation
async function advCreateConversation(conversation, ctx) {
  // Get text
  await ctx.reply(ctx.i18n.t('adv.create.enter_text'))
  const textMsg = await conversation.wait()
  if (textMsg.text.length > 50) {
    await ctx.reply('Text too long')
    return
  }
  const text = textMsg.text

  // Get link
  await ctx.reply(ctx.i18n.t('adv.create.enter_link'))
  const linkMsg = await conversation.wait()
  if (!linkMsg.entities || linkMsg.entities[0].type !== 'url' || /\s/.test(linkMsg.text)) {
    await ctx.reply('Invalid link')
    return
  }
  const link = linkMsg.text

  // Get locale
  const localeCount = await db.User.aggregate([
    { $match: { updatedAt: { $gte: new Date((new Date()).getTime() - (30 * 24 * 60 * 60 * 1000)) } } },
    {
      $group: {
        _id: '$settings.locale',
        count: { $sum: 1 }
      }
    }
  ])

  const keyboard = new InlineKeyboard()
  localeCount
    .sort((a, b) => b.count - a.count)
    .forEach(locale => {
      if (i18n.repository[locale._id]) {
        keyboard.text(`${i18n.t(locale._id, 'language_name')} — ${locale.count}`, `adv:locale:${locale._id}`)
      }
    })

  await ctx.reply(ctx.i18n.t('adv.create.select_locale'), {
    reply_markup: keyboard
  })

  const localeMsg = await conversation.wait()
  const locale = localeMsg.callbackQuery.data.split(':')[2]

  // Get price
  await ctx.reply(ctx.i18n.t('adv.create.enter_price', {
    averagePrice: 0.17
  }))
  const priceMsg = await conversation.wait()
  const price = parseFloat(priceMsg.text) * 100
  if (!price || price <= 0) {
    await ctx.reply('Invalid price')
    return
  }

  // Get count
  await ctx.reply('Enter count adv:')
  const countMsg = await conversation.wait()
  const count = parseInt(countMsg.text)
  if (!count || count <= 0) {
    await ctx.reply('Invalid count')
    return
  }

  // Create advertisement
  const adv = new db.Adv()
  adv._id = mongoose.Types.ObjectId()
  adv.creator = ctx.session.userInfo
  adv.text = text
  adv.link = link
  adv.locale = locale
  adv.price = price
  adv.count = count
  await adv.save()

  // Send to moderation
  const moderationKeyboard = new InlineKeyboard()
    .text(ctx.i18n.t('adv.moderate.accept_btn'), `adv:moderate:accept:${adv._id}`)
    .text(ctx.i18n.t('adv.moderate.deny_btn'), `adv:moderate:deny:${adv._id}`)

  await ctx.api.sendMessage(ctx.config.adv.moderationChat, ctx.i18n.t('adv.moderate.adv', {
    telegramId: ctx.from.id,
    name: ctx.from.first_name,
    adv
  }), {
    parse_mode: 'HTML',
    reply_markup: moderationKeyboard
  })

  await ctx.reply(ctx.i18n.t('adv.create.sent_moderate'))
}

// Create composer and add handlers
const composer = new Composer()

composer.command('adv_rules', onlyPm, ctx => ctx.reply(ctx.i18n.t('adv.rules'), {parse_mode: 'HTML'}))

composer.command('adv', onlyPm, async (ctx) => {
  await ctx.conversation.enter('advMain')
})

composer.callbackQuery(/adv:create/, async (ctx) => {
  await ctx.conversation.enter('advCreate')
})

// Add conversations
composer.use(conversations())
composer.use(createConversation(advMainConversation))
composer.use(createConversation(advCreateConversation))

module.exports = composer

const path = require('path')
const mongoose = require('mongoose')
const enot = require('enot-node')
const Composer = require('telegraf/composer')
const Markup = require('telegraf/markup')
const I18n = require('telegraf-i18n')
const Scene = require('telegraf/scenes/base')
const {
  scenes,
  onlyPm
} = require('../middlewares')
const {
  db
} = require('../database')

const i18n = new I18n({
  directory: path.resolve(__dirname, '../locales'),
  defaultLanguage: false
})

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

const advMain = new Scene('advMain')

advMain.enter(async ctx => {
  ctx.session.scenes = {}

  const replyMarkup = Markup.inlineKeyboard([
    [Markup.callbackButton(ctx.i18n.t('adv.main_menu.create_btn'), 'adv:create')],
    [Markup.callbackButton(ctx.i18n.t('adv.main_menu.list_btn'), 'adv:list')],
    [Markup.callbackButton(ctx.i18n.t('adv.main_menu.pay_btn'), 'adv:pay')]
  ])

  const userInfo = await ctx.db.User.findById(ctx.session.userInfo)

  await ctx.replyWithHTML(ctx.i18n.t('adv.about', {
    balance: (userInfo.adv.credit / 100).toFixed(2)
  }), {
    disable_web_page_preview: true,
    reply_to_message_id: ctx.message.message_id,
    allow_sending_without_reply: true,
    reply_markup: replyMarkup
  })
})

const advSetText = new Scene('advSetText')

advSetText.enter(async ctx => {
  await ctx.replyWithHTML(ctx.i18n.t('adv.create.enter_text'), {
    disable_web_page_preview: true
  })
})

advSetText.on('text', async ctx => {
  if (ctx.message.text.length > 50) {
    return ctx.scene.reenter()
  }

  ctx.session.scenes.text = ctx.message.text
  await ctx.scene.enter(advSetLink.id)
})

const advSetLink = new Scene('advSetLink')

advSetLink.enter(async ctx => {
  await ctx.replyWithHTML(ctx.i18n.t('adv.create.enter_link'), {
    disable_web_page_preview: true
  })
})

advSetLink.on('text', async ctx => {
  if (!ctx.message.entities || ctx.message.entities[0].type !== 'url' || /\s/.test(ctx.message.text)) {
    return ctx.scene.reenter()
  }

  ctx.session.scenes.link = ctx.message.text
  await ctx.scene.enter(advSetLocale.id)
})

const advSetLocale = new Scene('advSetLocale')

advSetLocale.enter(async ctx => {
  const localeCount = await ctx.db.User.aggregate([
    { $match: { updatedAt: { $gte: new Date((new Date()).getTime() - (30 * 24 * 60 * 60 * 1000)) } } },
    {
      $group: {
        _id: '$settings.locale',
        count: { $sum: 1 }
      }
    }
  ])

  const localeCountSorted = localeCount.sort((a, b) => {
    return b.count - a.count
  })

  const localContByCode = {}

  localeCountSorted.forEach(v => {
    localContByCode[v._id] = v.count
  })

  const button = []

  Object.keys(localContByCode).forEach((key) => {
    if (i18n.repository[key] && localContByCode[key] >= 1) button.push(Markup.callbackButton(i18n.t(key, 'language_name') + ' — ' + localContByCode[key], `adv:locale:${key}`))
  })

  await ctx.replyWithHTML(ctx.i18n.t('adv.create.select_locale'), {
    disable_web_page_preview: true,
    reply_markup: Markup.inlineKeyboard(button, {
      columns: 2
    })
  })
})

advSetLocale.action(/adv:locale:(.*)/, async ctx => {
  try {
    i18n.t(ctx.match[1], 'language_name')
  } catch (e) {
    return ctx.scene.reenter()
  }
  ctx.session.scenes.locale = ctx.match[1]
  await ctx.scene.enter(advSetPrice.id)
})

const advSetPrice = new Scene('advSetPrice')

advSetPrice.enter(async ctx => {
  await ctx.replyWithHTML(ctx.i18n.t('adv.create.enter_price', {
    averagePrice: 0.17
  }), {
    disable_web_page_preview: true
  })
})

advSetPrice.on('text', async ctx => {
  const price = parseFloat(ctx.message.text) * 100

  if (!price || price <= 0) {
    return ctx.scene.reenter()
  }

  ctx.session.scenes.price = price
  await ctx.scene.enter(advSetCount.id)
})

const advSetCount = new Scene('advSetCount')

advSetCount.enter(async ctx => {
  await ctx.replyWithHTML('Enter count adv:', {
    disable_web_page_preview: true
  })
})

advSetCount.on('text', async ctx => {
  const count = parseInt(ctx.message.text)

  if (!count || count <= 0) {
    return ctx.scene.reenter()
  }

  ctx.session.scenes.count = count
  await ctx.scene.enter(advSend.id)
})

const advSend = new Scene('advSend')

advSend.enter(async ctx => {
  console.log(ctx.session.scenes)

  const adv = new ctx.db.Adv()
  adv._id = mongoose.Types.ObjectId()
  adv.creator = ctx.session.userInfo
  adv.text = ctx.session.scenes.text
  adv.link = ctx.session.scenes.link
  adv.locale = ctx.session.scenes.locale
  adv.price = ctx.session.scenes.price
  adv.count = ctx.session.scenes.count
  await adv.save()

  const mederatorReplyMarkup = Markup.inlineKeyboard([
    [
      Markup.callbackButton(ctx.i18n.t('adv.moderate.accept_btn'), `adv:moderate:accept:${adv._id}`),
      Markup.callbackButton(ctx.i18n.t('adv.moderate.deny_btn'), `adv:moderate:deny:${adv._id}`)
    ]
  ])

  await ctx.tg.sendMessage(ctx.config.adv.moderationChat, ctx.i18n.t('adv.moderate.adv', {
    telegramId: ctx.from.id,
    name: ctx.from.first_name,
    adv
  }), {
    parse_mode: 'HTML',
    reply_markup: mederatorReplyMarkup
  })

  await ctx.replyWithHTML(ctx.i18n.t('adv.create.sent_moderate'), {
    disable_web_page_preview: true
  })
})

const advPayAmount = new Scene('advPayAmount')

advPayAmount.enter(ctx => {
  return ctx.replyWithHTML('Enter the amount in USD:', {
    disable_web_page_preview: true
  })
})

advPayAmount.on('text', async ctx => {
  const sum = parseFloat(ctx.message.text)

  if (!sum) return ctx.scene.reenter()

  const invoice = new ctx.db.Invoice()
  invoice._id = mongoose.Types.ObjectId()
  invoice.user = ctx.session.userInfo
  invoice.amount = Math.floor(sum * 100)
  await invoice.save()

  const fk = freeKassaGenerate({
    oa: sum,
    o: invoice._id,
    currency: 'USD',
    m: process.env.FREEKASSA_ID
  }, process.env.FREEKASSA_SECRET)

  const enotGen = enot({
    oa: sum,
    o: invoice._id,
    m: process.env.ENOT_ID,
    cr: 'USD'
  }, process.env.ENOT_SECRET)

  const replyMarkup = Markup.inlineKeyboard([
    [Markup.urlButton('Crypto (enot.io)', enotGen.url)],
    [Markup.urlButton('FreeKassa', fk.url)]
  ])

  await ctx.replyWithHTML('Link for payment:', {
    disable_web_page_preview: true,
    reply_markup: replyMarkup
  })

  return ctx.scene.leave()
})

const advListTypes = new Scene('advListTypes')

advListTypes.enter(async ctx => {
  const replyMarkup = Markup.inlineKeyboard([
    [Markup.callbackButton(ctx.i18n.t('adv.list.wait_btn'), 'adv:list:wait')],
    [Markup.callbackButton(ctx.i18n.t('adv.list.ready_btn'), 'adv:list:ready')],
    [Markup.callbackButton(ctx.i18n.t('adv.list.end_btn'), 'adv:list:end')]
  ])

  await ctx.replyWithHTML(ctx.i18n.t('adv.list.select_list'), {
    disable_web_page_preview: true,
    reply_markup: replyMarkup
  })
})

advListTypes.action(/adv:list:(.*)/, async ctx => {
  const statusTypes = {
    wait: { status: { $gte: 1 } },
    ready: { status: 2 },
    end: { status: 3 }
  }

  const advs = await ctx.db.Adv.find(statusTypes[ctx.match[1]])

  const inlineKeyboard = []

  advs.forEach(adv => {
    inlineKeyboard.push([Markup.callbackButton(adv.text, `adv:about:${adv.id}`)])
  })

  await ctx.replyWithHTML(ctx.i18n.t('adv.list.selected_list'), {
    disable_web_page_preview: true,
    reply_markup: Markup.inlineKeyboard(inlineKeyboard)
  })
})

const composer = new Composer()

composer.command('adv_rules', onlyPm, ctx => ctx.replyWithHTML(ctx.i18n.t('adv.rules')))

composer.use(
  scenes(
    advMain,
    advSetText,
    advSetLink,
    advSetLocale,
    advSetPrice,
    advSetCount,
    advSend,
    advPayAmount,
    advListTypes
  )
)

composer.action(/adv:create/, async (ctx, next) => {
  ctx.session.scenes = {
    new: true
  }
  return ctx.scene.enter(advSetText.id)
})

composer.action(/adv:list/, async (ctx, next) => {
  return ctx.scene.enter(advListTypes.id)
})

composer.action(/adv:pay/, async (ctx, next) => {
  return ctx.scene.enter(advPayAmount.id)
})

composer.command('adv', onlyPm, ({ scene }) => {
  return scene.enter(advMain.id)
})

module.exports = composer

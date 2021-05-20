// const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const freekassa = require('freekassa-node')
const enot = require('enot-node')
const Composer = require('telegraf/composer')
const Markup = require('telegraf/markup')
const I18n = require('telegraf-i18n')
const Scene = require('telegraf/scenes/base')
const {
  scenes,
  onlyPm
} = require('../middlewares')

const i18n = new I18n({
  directory: path.resolve(__dirname, '../locales'),
  defaultLanguage: false
})

const advMain = new Scene('advMain')

advMain.enter(async (ctx) => {
  ctx.session.scenes = {}

  const replyMarkup = Markup.inlineKeyboard([
    [Markup.callbackButton('Create link', 'adv:create')],
    [Markup.callbackButton('Adv list', 'adv:list')],
    [Markup.callbackButton('Pay', 'adv:pay')]
  ])

  await ctx.replyWithHTML('You can buy advertising from us ', {
    disable_web_page_preview: true,
    reply_to_message_id: ctx.message.message_id,
    reply_markup: replyMarkup
  })
})

const advSetText = new Scene('advSetText')

advSetText.enter(async (ctx) => {
  await ctx.replyWithHTML('Enter text adv:', {
    disable_web_page_preview: true
  })
})

advSetText.on('text', async (ctx) => {
  if (ctx.message.text.length > 50) {
    return ctx.scene.reenter()
  }

  ctx.session.scenes.text = ctx.message.text
  await ctx.scene.enter('advSetLink')
})

const advSetLink = new Scene('advSetLink')

advSetLink.enter(async (ctx) => {
  await ctx.replyWithHTML('Enter link adv:', {
    disable_web_page_preview: true
  })
})

advSetLink.on('text', async (ctx) => {
  if (!ctx.message.text.match(/^(http|https):\/\//)) {
    return ctx.scene.reenter()
  }

  ctx.session.scenes.link = ctx.message.text
  await ctx.scene.enter('advSetLocale')
})

const advSetLocale = new Scene('advSetLocale')

advSetLocale.enter(async (ctx) => {
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
    if (localContByCode[key] >= 1) button.push(Markup.callbackButton(i18n.t(key, 'language_name') + ' — ' + localContByCode[key], `adv:locale:${key}`))
  })

  await ctx.replyWithHTML('Set locale', {
    disable_web_page_preview: true,
    reply_markup: Markup.inlineKeyboard(button, {
      columns: 2
    })
  })
})

advSetLocale.action(/adv:locale:(.*)/, async (ctx) => {
  try {
    i18n.t(ctx.match[1], 'language_name')
  } catch (e) {
    return ctx.scene.reenter()
  }
  ctx.session.scenes.locale = ctx.match[1]
  await ctx.scene.enter('advSetPrice')
})

const advSetPrice = new Scene('advSetPrice')

advSetPrice.enter(async (ctx) => {
  await ctx.replyWithHTML('Enter price adv:', {
    disable_web_page_preview: true
  })
})

advSetPrice.on('text', async (ctx) => {
  const price = parseFloat(ctx.message.text) * 100

  if (!price || price <= 0) {
    return ctx.scene.reenter()
  }

  ctx.session.scenes.price = price
  await ctx.scene.enter('advSetCount')
})

const advSetCount = new Scene('advSetCount')

advSetCount.enter(async (ctx) => {
  await ctx.replyWithHTML('Enter count adv:', {
    disable_web_page_preview: true
  })
})

advSetCount.on('text', async (ctx) => {
  const count = parseInt(ctx.message.text)

  if (!count || count <= 0) {
    return ctx.scene.reenter()
  }

  ctx.session.scenes.count = count
  await ctx.scene.enter('advSend')
})

const advSend = new Scene('advSend')

advSend.enter(async (ctx) => {
  console.log(ctx.session.scenes)

  const adv = new ctx.db.Adv()
  adv.creator = ctx.session.user
  adv.text = ctx.session.scenes.text
  adv.link = ctx.session.scenes.link
  adv.locale = ctx.session.scenes.locale
  adv.price = ctx.session.scenes.price
  adv.count = ctx.session.scenes.count
  await adv.save()

  await ctx.replyWithHTML('Adv send to moderate', {
    disable_web_page_preview: true
  })
})

const advPayAmount = new Scene('advPayAmount')

advPayAmount.enter((ctx) => {
  return ctx.replyWithHTML('Enter the amount in USD:', {
    disable_web_page_preview: true
  })
})

advPayAmount.on('text', async (ctx) => {
  // const fk = freekassa({
  //   oa: parseInt(ctx.message.text),
  //   o: 'pay',
  //   m: process.env.FREEKASSA_ID
  // }, process.env.FREEKASSA_SECRET)

  const invoice = new ctx.db.Invoice()
  invoice._id = mongoose.Types.ObjectId()
  invoice.user = ctx.session.userInfo
  invoice.amount = Math.floor(parseFloat(ctx.message.text) * 100)
  await invoice.save()

  const enotGen = enot({
    oa: parseFloat(ctx.message.text),
    o: invoice._id,
    m: process.env.ENOT_ID
  }, process.env.ENOT_SECRET)

  return ctx.replyWithHTML(enotGen.url, {
    disable_web_page_preview: true
  })
})

const composer = new Composer()

composer.use(
  scenes(
    advMain,
    advSetText,
    advSetLink,
    advSetLocale,
    advSetPrice,
    advSetCount,
    advSend,
    advPayAmount
  )
)

composer.action(/adv:create/, async (ctx, next) => {
  ctx.session.scenes = {
    new: true
  }
  return ctx.scene.enter('advSetText')
})

composer.action(/adv:pay/, async (ctx, next) => {
  return ctx.scene.enter('advPayAmount')
})

composer.command('adv', onlyPm, ({ scene }) => {
  scene.enter('advMain')
})

module.exports = composer

const Markup = require('telegraf/markup')
const { v4: uuidv4 } = require('uuid')
const { LiqPay } = require('../utils')

const liqpay = new LiqPay(process.env.LIQPAY_PUBLIC, process.env.LIQPAY_PRIVATE)

module.exports = async (ctx) => {
  if (ctx.updateType === 'message') {
    // if (ctx.chat.type === 'private') {
    //   await ctx.replyWithHTML(ctx.i18n.t('donate.info'), {
    //     reply_markup: Markup.inlineKeyboard([
    //       [
    //         Markup.callbackButton('100 RUB', 'donate:100'),
    //         Markup.callbackButton('150 RUB', 'donate:150'),
    //         Markup.callbackButton('300 RUB', 'donate:300')
    //       ],
    //       [
    //         Markup.callbackButton('500 RUB', 'donate:500'),
    //         Markup.callbackButton('1000 RUB', 'donate:1000')
    //       ]
    //     ])
    //   })
    // } else {
    //   await ctx.replyWithHTML(ctx.i18n.t('donate.info_group'))
    // }

    await ctx.replyWithHTML(ctx.i18n.t('donate.info'), {
      disable_web_page_preview: true
    })
  } else if (ctx.updateType === 'callback_query') {
    const orderId = uuidv4()

    let amount = ctx.match[2] || 0

    if (amount < 100) amount = 100
    amount *= 100

    const currency = 'RUB'

    const invoice = {
      provider_token: process.env.PROVIDER_TOKEN,
      start_parameter: 'donate',
      title: ctx.i18n.t('donate.title', {
        botUsername: ctx.options.username
      }),
      description: ctx.i18n.t('donate.description'),
      currency,
      prices: [
        {
          label: `Donate @${ctx.options.username}`,
          amount
        }
      ],
      payload: { orderId }
    }

    const liqpayLink = liqpay.formattingLink({
      action: 'pay',
      amount: amount / 100,
      currency,
      description: ctx.i18n.t('donate.description'),
      order_id: orderId,
      result_url: `https://t.me/${ctx.options.username}?start=liqpay_${orderId}`,
      version: 3
    })

    await ctx.replyWithInvoice(invoice, Markup.inlineKeyboard([
      [Markup.payButton(ctx.i18n.t('donate.pay'))],
      [Markup.urlButton(ctx.i18n.t('donate.liqpay'), liqpayLink)],
      [Markup.urlButton(ctx.i18n.t('donate.other'), 'donate.lyo.su')]
    ]).extra())
  } else if (ctx.updateSubTypes[0] === 'successful_payment') {
    await ctx.replyWithHTML(ctx.i18n.t('donate.successful'))
  }
}

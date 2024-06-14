const Markup = require('telegraf/markup')
const { v4: uuidv4 } = require('uuid')
const { LiqPay } = require('../utils')

const liqpay = new LiqPay(process.env.LIQPAY_PUBLIC, process.env.LIQPAY_PRIVATE)

module.exports = async ctx => {
  if (ctx.updateSubTypes[0] === 'successful_payment') {
    await ctx.replyWithHTML(ctx.i18n.t('donate.successful'))
  } else if (ctx.updateType === 'message') {
    const donateStars = [
      50, 250, 500, 1000, 1500, 2500
    ]

    const invoces = []

    for (const amount of donateStars) {
      const orderId = uuidv4()

      invoces.push(await ctx.tg.callApi('createInvoiceLink', {
        title: `Donate ${amount} Stars`,
        description: 'Donate to support the bot',
        payload: orderId,
        currency: 'XTR',
        prices: [{ label: 'Stars', amount: amount }]
      }))
    }

    await ctx.replyWithHTML(ctx.i18n.t('donate.info'), {
      reply_markup: Markup.inlineKeyboard(invoces.map((invoice, index) =>
        Markup.urlButton(`${donateStars[index]} Stars`, invoice)
      ), {
        columns: 2
      }),
      disable_web_page_preview: true
    })
  }
}

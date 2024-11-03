const { InlineKeyboard } = require('grammy')
const { v4: uuidv4 } = require('uuid')
const { LiqPay } = require('../utils')

const liqpay = new LiqPay(process.env.LIQPAY_PUBLIC, process.env.LIQPAY_PRIVATE)

module.exports = async ctx => {
  if (ctx.msg?.successful_payment) {
    await ctx.reply(ctx.i18n.t('donate.successful'), {
      parse_mode: 'HTML'
    })
  } else if (ctx.msg) {
    const donateStars = [
      50, 250, 500, 1000, 1500, 2500
    ]

    const invoices = []

    for (const amount of donateStars) {
      const orderId = uuidv4()

      invoices.push(await ctx.api.createInvoiceLink({
        title: `Donate ${amount} Stars`,
        description: 'Donate to support the bot',
        payload: orderId,
        currency: 'XTR',
        prices: [{ label: 'Stars', amount: amount }]
      }))
    }

    const keyboard = new InlineKeyboard()
    invoices.forEach((invoice, index) => {
      if (index % 2 === 0) keyboard.row()
      keyboard.url(`${donateStars[index]} Stars`, invoice)
    })

    await ctx.reply(ctx.i18n.t('donate.info'), {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      disable_web_page_preview: true
    })
  }
}

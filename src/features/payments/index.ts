import { randomUUID } from 'node:crypto'
import { Composer, InlineKeyboard } from 'grammy'
import type { BotContext } from '../../core/types'
import { config } from '../../config/env'

/** Donation tiers, in Telegram Stars (XTR). */
const STAR_AMOUNTS = [50, 250, 500, 1000, 1500, 2500] as const

export const paymentsFeature = new Composer<BotContext>()

// /donate — one Stars invoice link per tier, laid out two per row.
paymentsFeature.command('donate', async (ctx) => {
  const links = await Promise.all(
    STAR_AMOUNTS.map((amount) =>
      ctx.api.createInvoiceLink(
        ctx.t('donate-title', { botUsername: ctx.me.username }),
        ctx.t('donate-description'),
        randomUUID(),
        '', // Stars (XTR) require an empty provider token.
        'XTR',
        [{ label: 'Stars', amount }],
      ),
    ),
  )

  const kb = new InlineKeyboard()
  links.forEach((url, i) => {
    kb.url(`${STAR_AMOUNTS[i]} ⭐`, url)
    if (i % 2 === 1) kb.row()
  })

  await ctx.reply(ctx.t('donate-info'), {
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup: kb,
  })
})

// Stars checkout must always be approved (no inventory to reconcile).
paymentsFeature.on('pre_checkout_query', (ctx) => {
  void ctx.answerPreCheckoutQuery(true).catch(() => {})
})

paymentsFeature.on('message:successful_payment', async (ctx) => {
  await ctx.reply(ctx.t('donate-successful'), { parse_mode: 'HTML' }).catch(() => {})
})

// /refund <userId> <telegram_payment_charge_id> — owner only.
paymentsFeature.hears(/^\/refund(?:@\S+)?\s+(\d+)\s+(\S+)/, async (ctx) => {
  if (!config.ADMIN_ID || ctx.from?.id !== config.ADMIN_ID) return
  const userId = Number(ctx.match?.[1])
  const chargeId = ctx.match?.[2]
  if (!Number.isFinite(userId) || !chargeId) return
  try {
    await ctx.api.refundStarPayment(userId, chargeId)
    await ctx.reply(`Refund success: ${userId} ${chargeId}`)
  } catch (err) {
    await ctx.reply(`Refund error: ${err instanceof Error ? err.message : String(err)}`)
  }
})

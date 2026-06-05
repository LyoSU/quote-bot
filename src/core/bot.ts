import { Bot } from 'grammy'
import { autoRetry } from '@grammyjs/auto-retry'
import { apiThrottler } from '@grammyjs/transformer-throttler'
import { sequentialize } from '@grammyjs/runner'
import { config } from '../config/env'
import { logger } from './logger'
import type { BotContext } from './types'
import { registerErrorBoundary } from './errors'
import { fastPath } from '../middlewares/fast-path'
import { updateDuration } from './metrics'
import { requestRate } from './rate-meter'

/**
 * Builds the bot with the CORE middleware stack only. It deliberately knows
 * nothing about the database or features — the composition root (index.ts)
 * mounts the context middleware and feature composers on top, in order. Order
 * of the core stack:
 *
 *   1. fastPath        — drop ~95% noise before anything expensive runs
 *   2. sequentialize   — per-chat ordering, cross-chat parallelism (relevant only)
 *   3. logger + timing — context-rich child logger; measure handler latency
 *
 * Outgoing API calls go through a throttler (respects Telegram's rate limits)
 * and auto-retry (handles 429 retry_after) — no hand-rolled timeout wrappers.
 */
export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.BOT_TOKEN, {
    client: { apiRoot: config.BOT_API_ROOT },
  })

  // --- Outgoing resilience -------------------------------------------------
  bot.api.config.use(apiThrottler())
  bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 5 }))

  // --- 1. Cheap noise filter ----------------------------------------------
  bot.use(fastPath)

  // --- 2. Per-chat ordering (only relevant updates reach here) -------------
  bot.use(sequentialize((ctx) => ctx.chat?.id.toString()))

  // --- 3. Per-update context + latency measurement -------------------------
  bot.use(async (ctx, next) => {
    ctx.logger = logger.child({
      updateId: ctx.update.update_id,
      chatId: ctx.chat?.id,
      userId: ctx.from?.id,
    })
    requestRate.tick()
    const stop = updateDuration.startTimer()
    try {
      await next()
      stop({ ok: 'true' })
    } catch (err) {
      stop({ ok: 'false' })
      throw err
    }
  })

  registerErrorBoundary(bot)
  return bot
}

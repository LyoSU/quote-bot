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
import { networkRetry } from './network-retry'
import { pollGuard } from './poll-guard'
import { pollWatch } from './poll-watch'
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
 * Outgoing API calls go through a throttler (respects Telegram's rate limits),
 * networkRetry (bridges Bot API server restarts: capped, logged) and auto-retry
 * (handles 429 retry_after). auto-retry rethrows HttpError — its own network
 * handling is silent and unbounded, which hid local-server outages for up to
 * an hour. Transformers installed later run first, so the chain is
 * autoRetry → networkRetry → throttler → fetch.
 */
export interface CreateBotOptions {
  /** Injectable for tests — exercises the real transformer chain offline. */
  fetchFn?: typeof fetch
}

export function createBot(opts: CreateBotOptions = {}): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.BOT_TOKEN, {
    client: {
      apiRoot: config.BOT_API_ROOT,
      // grammY's default HTTP timeout is 500s. The runner long-polls with a 30s
      // window, so a healthy getUpdates returns well within ~30s. When the
      // connection silently half-opens (the response lost in the Cloudflare /
      // traefik path in front of the local server), the default makes the bot
      // wait the full 500s on a dead socket — observed as 8-minute dead spells
      // with the queue frozen. Capping just above the long-poll window turns
      // that into a ~10s blip the runner recovers from on a fresh connection.
      timeoutSeconds: 40,
      ...(opts.fetchFn ? { fetch: opts.fetchFn } : {}),
    },
  })

  // --- Outgoing resilience -------------------------------------------------
  bot.api.config.use(pollWatch.transformer())
  bot.api.config.use(pollGuard.transformer())
  bot.api.config.use(apiThrottler())
  bot.api.config.use(networkRetry({ attempts: 5, maxDelayMs: 8_000 }))
  bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 5, rethrowHttpErrors: true }))

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

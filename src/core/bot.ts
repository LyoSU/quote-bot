import { Bot } from 'grammy'
import { autoRetry } from '@grammyjs/auto-retry'
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
 * Outgoing API calls go through networkRetry (bridges Bot API server restarts:
 * capped, logged) and auto-retry (handles 429 retry_after). auto-retry rethrows
 * HttpError — its own network handling is silent and unbounded, which hid
 * local-server outages for up to an hour. Transformers installed later run
 * first, so the chain is autoRetry → networkRetry → fetch.
 *
 * There is deliberately NO send throttler: the deprecated Bottleneck-based
 * apiThrottler queued excess sends unboundedly and silently (per-group drain of
 * 1 msg/3s), and handlers awaiting those queued sends pinned runner sink slots
 * until the whole bot froze with an empty log. Rate limiting is Telegram's job:
 * a flooding chat gets 429s, auto-retry honors retry_after up to 30s, anything
 * larger fails fast into the error boundary — backpressure stays local to the
 * offending chat instead of freezing everyone.
 */
export interface CreateBotOptions {
  /** Injectable for tests — exercises the real transformer chain offline. */
  fetchFn?: typeof fetch
}

/** A /q with a 30s render budget stays well under this; above it, warn. */
const SLOW_UPDATE_MS = 15_000

export function createBot(opts: CreateBotOptions = {}): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.BOT_TOKEN, {
    client: {
      apiRoot: config.BOT_API_ROOT,
      // grammY's default HTTP timeout is 500s. The runner long-polls with a
      // shortened 10s window (see runner.ts), so this caps how long the bot
      // waits on a SILENTLY half-open socket — the response lost somewhere in
      // the Cloudflare/traefik path in front of the remote Bot API server,
      // leaving the connection alive but dead. The default 500s turned each
      // such half-open into an 8-minute dead spell with the queue frozen.
      // 20s (2× the long-poll window) detects it deterministically — no false
      // timeouts on a legitimately empty long-poll, recovery on a fresh
      // connection within ~20s instead of minutes.
      timeoutSeconds: 20,
      ...(opts.fetchFn ? { fetch: opts.fetchFn } : {}),
    },
  })

  // --- Outgoing resilience -------------------------------------------------
  bot.api.config.use(pollWatch.transformer())
  bot.api.config.use(pollGuard.transformer())
  bot.api.config.use(networkRetry({ attempts: 5, maxDelayMs: 8_000 }))
  // maxDelaySeconds 30: group-chat 429s routinely carry retry_after of 10-40s;
  // a lower cap made auto-retry rethrow them immediately and /q failed silently.
  bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 30, rethrowHttpErrors: true }))

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
    const startedMs = Date.now()
    const stop = updateDuration.startTimer()
    try {
      await next()
      stop({ ok: 'true' })
    } catch (err) {
      stop({ ok: 'false' })
      throw err
    } finally {
      // updateDuration only feeds Prometheus; a stall investigation usually
      // starts from the logs, so anything pathologically slow gets a line too.
      const tookMs = Date.now() - startedMs
      if (tookMs >= SLOW_UPDATE_MS) ctx.logger.warn({ tookMs }, 'slow update')
    }
  })

  registerErrorBoundary(bot)
  return bot
}

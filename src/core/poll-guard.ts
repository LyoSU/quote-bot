import type { Transformer } from 'grammy'
import { config } from '../config/env'
import { logger } from './logger'
import { requestShutdown } from './shutdown'

/**
 * Watches getUpdates for "Logged out" — the answer of a Bot API server the
 * token is NOT logged in on (typically the cloud after the bot migrated to a
 * self-hosted server, or the local server after TDLib dropped the session).
 * It's a 400, so the runner happily retries it forever — the bot looks alive
 * but processes nothing. Waiting can't fix it; after a few consecutive strikes
 * we shut down loudly and let the supervisor restart, which re-creates the
 * server-side client (and rides out Telegram's ~10 min re-login cooldown).
 *
 * 401/409 need no guard: grammY's runner already treats them as unrecoverable,
 * which lands in the unhandledRejection handler → fatal exit.
 */
export class PollGuard {
  private strikes = 0
  private fired = false

  constructor(
    private readonly threshold: number,
    private readonly onFatal: (description: string) => void,
  ) {}

  transformer(): Transformer {
    return async (prev, method, payload, signal) => {
      const result = await prev(method, payload, signal)
      if (method !== 'getUpdates') return result
      if (result.ok) {
        this.strikes = 0
      } else if (/logged out/i.test(result.description ?? '')) {
        if (++this.strikes >= this.threshold && !this.fired) {
          this.fired = true
          this.onFatal(result.description ?? 'Logged out')
        }
      }
      return result
    }
  }
}

/** Three strikes ≈ 15s of failed polls at the runner's 5s retry interval. */
export const pollGuard = new PollGuard(3, (description) => {
  logger.fatal(
    { description, apiRoot: config.BOT_API_ROOT },
    'Token is not logged in on this Bot API server (wrong BOT_API_ROOT, or the server lost its session) — restarting',
  )
  requestShutdown('logged-out', 1)
})

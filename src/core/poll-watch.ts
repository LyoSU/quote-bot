import type { Transformer } from 'grammy'

/**
 * Tracks the age of the last successful `getUpdates` so readiness can reflect
 * reality: while the (local) Bot API server is down the runner formally keeps
 * "running", silently retrying — without this, /health would report 200 for a
 * bot that processes nothing. The transformer observes the polling traffic
 * that already flows; no extra requests, no timers.
 *
 * Time is injectable so the logic stays pure and unit-testable.
 */
export class PollWatch {
  private lastOkMs: number

  constructor(
    private readonly maxAgeMs: number,
    nowMs: number = Date.now(),
  ) {
    // Counts as fresh from construction — startup grace until the first poll.
    this.lastOkMs = nowMs
  }

  markOk(nowMs: number = Date.now()): void {
    this.lastOkMs = nowMs
  }

  isFresh(nowMs: number = Date.now()): boolean {
    return nowMs - this.lastOkMs <= this.maxAgeMs
  }

  /** API transformer that marks freshness on every successful getUpdates. */
  transformer(): Transformer {
    return async (prev, method, payload, signal) => {
      const result = await prev(method, payload, signal)
      if (method === 'getUpdates' && result.ok) this.markOk()
      return result
    }
  }
}

/**
 * Polling freshness read by /health. 90s ≈ three 30s long-poll cycles — one
 * missed cycle is noise, three means the Bot API server is really gone.
 */
export const pollWatch = new PollWatch(90_000)

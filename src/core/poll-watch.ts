import type { Transformer } from 'grammy'
import { logger } from './logger'
import { pollsTotal } from './metrics'

const log = logger.child({ module: 'poll-watch' })

/** A dry spell this long gets logged, then re-logged once per interval. */
export const DRY_LOG_INTERVAL_MS = 300_000

/**
 * Tracks the age of the last successful `getUpdates` so readiness can reflect
 * reality: while the (local) Bot API server is down the runner formally keeps
 * "running", silently retrying — without this, /health would report 200 for a
 * bot that processes nothing. The transformer observes the polling traffic
 * that already flows; no extra requests, no timers.
 *
 * It also classifies every poll (updates / empty / error) into a Prometheus
 * counter and logs the stall mode that freshness alone can't see: polls
 * succeeding while the server delivers nothing for minutes — how a Bot API
 * server that lost its Telegram session looks from this side of the wire.
 *
 * Time is injectable so the logic stays pure and unit-testable.
 */
export class PollWatch {
  private lastOkMs: number
  private lastDeliveryMs: number
  private nextDryLogMs: number
  private dryPolls = 0

  constructor(
    private readonly maxAgeMs: number,
    nowMs: number = Date.now(),
  ) {
    // Counts as fresh from construction — startup grace until the first poll.
    this.lastOkMs = nowMs
    this.lastDeliveryMs = nowMs
    this.nextDryLogMs = nowMs + DRY_LOG_INTERVAL_MS
  }

  markOk(nowMs: number = Date.now()): void {
    this.lastOkMs = nowMs
  }

  /** Records one successful poll; logs dry spells crossing the interval. */
  observe(updateCount: number, nowMs: number = Date.now()): void {
    this.markOk(nowMs)
    if (updateCount > 0) {
      pollsTotal.inc({ outcome: 'updates' })
      if (nowMs - this.lastDeliveryMs >= DRY_LOG_INTERVAL_MS) {
        log.info(
          { drySeconds: Math.round((nowMs - this.lastDeliveryMs) / 1000), dryPolls: this.dryPolls },
          'getUpdates delivering again after a dry spell',
        )
      }
      this.lastDeliveryMs = nowMs
      this.dryPolls = 0
      this.nextDryLogMs = nowMs + DRY_LOG_INTERVAL_MS
      return
    }
    pollsTotal.inc({ outcome: 'empty' })
    this.dryPolls++
    if (nowMs >= this.nextDryLogMs) {
      log.warn(
        { drySeconds: Math.round((nowMs - this.lastDeliveryMs) / 1000), dryPolls: this.dryPolls },
        'polling succeeds but no updates are arriving',
      )
      this.nextDryLogMs = nowMs + DRY_LOG_INTERVAL_MS
    }
  }

  isFresh(nowMs: number = Date.now()): boolean {
    return nowMs - this.lastOkMs <= this.maxAgeMs
  }

  /** Seconds since the last successful poll — exported as a Prometheus gauge. */
  ageSeconds(nowMs: number = Date.now()): number {
    return Math.round((nowMs - this.lastOkMs) / 1000)
  }

  /**
   * API transformer observing every getUpdates. Installed innermost in the
   * chain, so it sees raw wire responses — before any retry rewrites them.
   */
  transformer(): Transformer {
    return async (prev, method, payload, signal) => {
      const result = await prev(method, payload, signal)
      if (method !== 'getUpdates') return result
      if (result.ok) {
        this.observe(Array.isArray(result.result) ? result.result.length : 0)
      } else {
        // e.g. 400 "Logged out" — the session-theft marker; runner retries it
        // silently, so this is the only timestamped trace it leaves.
        pollsTotal.inc({ outcome: 'error' })
        log.warn({ code: result.error_code, description: result.description }, 'getUpdates rejected')
      }
      return result
    }
  }
}

/**
 * Polling freshness read by /health. 90s ≈ three 30s long-poll cycles — one
 * missed cycle is noise, three means the Bot API server is really gone.
 */
export const pollWatch = new PollWatch(90_000)

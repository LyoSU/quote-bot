import { Stats } from '../../db/models/stats'
import { config } from '../../config/env'
import { logger } from '../../core/logger'
import { onShutdown } from '../../core/shutdown'

const log = logger.child({ module: 'stats' })

/**
 * Aggregates request count + latency in memory and flushes a single Stats row
 * every STATS_FLUSH_MS. Replaces the old Redis-bucketed pipeline: with one
 * process there's nothing to share across, so plain in-memory counters suffice.
 * Live, high-resolution numbers live in Prometheus (core/metrics); this
 * collection is the long-term series the webapp reads.
 */
class StatsService {
  private count = 0
  private totalDurationMs = 0
  private windowStart = Date.now()
  private timer?: NodeJS.Timeout

  /** Record one handled relevant update and how long it took. */
  record(durationMs: number): void {
    this.count++
    this.totalDurationMs += durationMs
  }

  start(): void {
    this.timer = setInterval(() => void this.flush(), config.STATS_FLUSH_MS)
    this.timer.unref()
    onShutdown('stats', () => this.flush())
  }

  private async flush(): Promise<void> {
    const now = Date.now()
    const elapsedSec = Math.max((now - this.windowStart) / 1000, 1)
    const count = this.count
    const totalMs = this.totalDurationMs

    this.count = 0
    this.totalDurationMs = 0
    this.windowStart = now

    if (count === 0) return

    try {
      await Stats.create({
        rps: count / elapsedSec,
        responseTime: totalMs / count,
        date: new Date(now),
      })
    } catch (err) {
      log.warn({ err }, 'Stats flush failed')
    }
  }
}

export const statsService = new StatsService()

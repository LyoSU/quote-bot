/**
 * O(1) sliding-window rate meter. A ring of per-second counters: `tick()` bumps
 * the current second, `rate()` averages the window. Fixed memory, no per-event
 * allocation, no background timer — stale buckets are cleared lazily on access.
 * Replaces the legacy Redis sliding buckets that fed /ping's RPS figure.
 *
 * Time is injectable so the logic stays pure and unit-testable.
 */
export class RateMeter {
  private readonly buckets: number[]
  private readonly windowSec: number
  private lastSec = 0

  constructor(windowSec = 60) {
    this.windowSec = windowSec
    this.buckets = new Array<number>(windowSec).fill(0)
  }

  /** Advance to `nowSec`, zeroing every bucket we skipped over since last touch. */
  private rollTo(nowSec: number): void {
    if (nowSec <= this.lastSec) return
    const gap = Math.min(nowSec - this.lastSec, this.windowSec)
    for (let i = 1; i <= gap; i++) this.buckets[(this.lastSec + i) % this.windowSec] = 0
    this.lastSec = nowSec
  }

  tick(nowMs: number = Date.now()): void {
    const nowSec = Math.floor(nowMs / 1000)
    this.rollTo(nowSec)
    this.buckets[nowSec % this.windowSec]!++
  }

  /** Events per second averaged over the window. */
  rate(nowMs: number = Date.now()): number {
    const nowSec = Math.floor(nowMs / 1000)
    this.rollTo(nowSec)
    let total = 0
    for (const b of this.buckets) total += b
    return total / this.windowSec
  }
}

/** Relevant updates handled per second (60s window), read by /ping. */
export const requestRate = new RateMeter(60)

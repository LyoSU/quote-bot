import { describe, it, expect } from 'vitest'
import { RateMeter } from './rate-meter'

const T0 = 1_000_000_000_000 // fixed epoch ms; time is injected, never read from the clock

describe('RateMeter', () => {
  it('averages ticks over the window', () => {
    const m = new RateMeter(60)
    for (let i = 0; i < 60; i++) m.tick(T0 + i * 1000) // 1 tick/sec for 60s
    expect(m.rate(T0 + 59_000)).toBeCloseTo(1) // 60 events / 60s
  })

  it('counts multiple ticks within the same second', () => {
    const m = new RateMeter(60)
    m.tick(T0)
    m.tick(T0 + 100)
    m.tick(T0 + 900)
    expect(m.rate(T0)).toBeCloseTo(3 / 60)
  })

  it('expires old buckets as the window slides past them', () => {
    const m = new RateMeter(60)
    m.tick(T0) // second 0
    // Jump a full window forward: the second-0 bucket must have been cleared.
    expect(m.rate(T0 + 60_000)).toBe(0)
  })

  it('clears only skipped buckets across a gap, keeping recent ones', () => {
    const m = new RateMeter(60)
    m.tick(T0 + 58_000) // second 58
    m.tick(T0 + 59_000) // second 59
    // At second 60, second-0 wraps to bucket 0 (was empty); 58 & 59 still in window.
    expect(m.rate(T0 + 60_000)).toBeCloseTo(2 / 60)
  })
})

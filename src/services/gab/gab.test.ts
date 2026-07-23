import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// gab lazily loads per-group config from the Group model; stub it.
vi.mock('../../db/models', () => ({
  Group: {
    findOne: () => ({ select: () => ({ lean: () => Promise.resolve({ settings: { randomQuoteGab: 1 } }) }) }),
  },
}))

import { considerGab, recordActivity, activeSpeakers } from './index'

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe('gab activity tracking', () => {
  it('reports recently-active speakers', () => {
    recordActivity(-1001, 11)
    recordActivity(-1001, 12)
    expect(activeSpeakers(-1001).sort()).toEqual([11, 12])
    expect(activeSpeakers(-9999)).toEqual([])
  })

  it('keeps a continuously active group tracked past the map TTL', () => {
    vi.useFakeTimers()
    try {
      const chat = -1004
      recordActivity(chat, 21) // t=0: map created, base TTL ≈ 10 min
      vi.advanceTimersByTime(7 * 60_000)
      recordActivity(chat, 21) // t=7 min: refreshes the map's TTL
      recordActivity(chat, 22)
      vi.advanceTimersByTime(4 * 60_000) // t=11 min — past the ORIGINAL 10-min TTL
      // Both spoke 4 min ago (inside the 5-min window); without the TTL refresh
      // the whole map would have expired at t=10 min and this would be empty.
      expect(activeSpeakers(chat).sort()).toEqual([21, 22])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('considerGab', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0))
  afterEach(() => vi.restoreAllMocks())

  it('loads config on first sight (returns false), then fires once, then cools down', async () => {
    const chat = -1002
    recordActivity(chat, 1)
    recordActivity(chat, 2)

    // First call: no cached state yet → schedules a load, returns false.
    expect(considerGab(chat)).toBe(false)
    await tick()

    // Now loaded (gab=1), 2 speakers active, Math.random=0 → fires.
    expect(considerGab(chat)).toBe(true)
    // Immediately again: within the cooldown window → no double-fire.
    expect(considerGab(chat)).toBe(false)
  })

  it('does not fire without enough active speakers', async () => {
    const chat = -1003
    recordActivity(chat, 1) // only one speaker
    expect(considerGab(chat)).toBe(false)
    await tick()
    expect(considerGab(chat)).toBe(false)
  })
})

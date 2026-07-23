import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../config/env', () => ({ config: { ADMIN_ID: 777 } }))

import { TokenBucket, checkQuoteRate } from './rate-limit'

const T0 = 1_000_000

// Module-level buckets persist across tests — distinct ids per test isolate
// them; fake timers control the notice window (LruCache TTLs read Date.now).
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(T0)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('TokenBucket', () => {
  it('allows a burst up to capacity, then rejects', () => {
    const bucket = new TokenBucket(3, 5_000)
    for (let i = 0; i < 3; i++) {
      expect(bucket.has(1, T0)).toBe(true)
      bucket.take(1, T0)
    }
    expect(bucket.has(1, T0)).toBe(false)
  })

  it('earns one token per refill interval, capped at capacity', () => {
    const bucket = new TokenBucket(2, 5_000)
    bucket.take(1, T0)
    bucket.take(1, T0)
    expect(bucket.has(1, T0 + 4_999)).toBe(false)
    expect(bucket.has(1, T0 + 5_000)).toBe(true) // one token back
    bucket.take(1, T0 + 5_000)
    expect(bucket.has(1, T0 + 5_001)).toBe(false)
    expect(bucket.has(1, T0 + 60_000)).toBe(true) // long idle refills to cap, not beyond
    bucket.take(1, T0 + 60_000)
    bucket.take(1, T0 + 60_000)
    expect(bucket.has(1, T0 + 60_000)).toBe(false)
  })

  it('reports seconds until the next token', () => {
    const bucket = new TokenBucket(1, 5_000)
    bucket.take(1, T0)
    expect(bucket.retryAfterSeconds(1, T0 + 1_000)).toBe(4)
    expect(bucket.retryAfterSeconds(2, T0)).toBe(0) // untouched key
  })
})

describe('checkQuoteRate', () => {
  it('lets a normal user through and rejects past the personal burst', () => {
    const user = 101
    for (let i = 0; i < 5; i++) expect(checkQuoteRate(user, user, T0).ok).toBe(true)
    const rejected = checkQuoteRate(user, user, T0)
    expect(rejected.ok).toBe(false)
  })

  it('a rejection never drains the chat bucket (check both, then charge)', () => {
    const chat = -201
    const flooder = 202
    const bystander1 = 203
    const bystander2 = 204

    for (let i = 0; i < 5; i++) expect(checkQuoteRate(flooder, chat, T0).ok).toBe(true)
    // Flooder is out of personal tokens; the chat has 5 of 10 left.
    expect(checkQuoteRate(flooder, chat, T0).ok).toBe(false)
    expect(checkQuoteRate(flooder, chat, T0).ok).toBe(false)

    // All five remaining chat tokens are still there for the bystanders.
    for (let i = 0; i < 3; i++) expect(checkQuoteRate(bystander1, chat, T0).ok).toBe(true)
    for (let i = 0; i < 2; i++) expect(checkQuoteRate(bystander2, chat, T0).ok).toBe(true)
    // Chat budget exhausted now, even though bystander2 has personal tokens left.
    expect(checkQuoteRate(bystander2, chat, T0).ok).toBe(false)
  })

  it('notifies once per chat per window, then drops silently', () => {
    const chat = -301
    const user = 302
    for (let i = 0; i < 5; i++) checkQuoteRate(user, chat, T0)

    const first = checkQuoteRate(user, chat, T0)
    const second = checkQuoteRate(user, chat, T0)
    expect(first).toMatchObject({ ok: false, notify: true })
    expect(second).toMatchObject({ ok: false, notify: false })
    expect(first.ok === false && first.retryAfterSeconds >= 1).toBe(true)

    // Past the notice window: spend the refilled burst, then the next
    // rejection speaks up again.
    vi.setSystemTime(T0 + 31_000)
    for (let i = 0; i < 5; i++) checkQuoteRate(user, chat, T0 + 31_000)
    expect(checkQuoteRate(user, chat, T0 + 31_000)).toMatchObject({ ok: false, notify: true })
  })

  it('exempts the bot owner', () => {
    for (let i = 0; i < 20; i++) expect(checkQuoteRate(777, -401, T0).ok).toBe(true)
  })
})

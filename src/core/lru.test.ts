import { describe, it, expect, vi, afterEach } from 'vitest'
import { LruCache } from './lru'

afterEach(() => {
  vi.useRealTimers()
})

describe('LruCache', () => {
  it('stores and retrieves values', () => {
    const c = new LruCache<string, number>(10, 1000)
    c.set('a', 1)
    expect(c.get('a')).toBe(1)
    expect(c.get('missing')).toBeUndefined()
  })

  it('evicts the least-recently-used entry past capacity', () => {
    const c = new LruCache<string, number>(2, 1000)
    c.set('a', 1)
    c.set('b', 2)
    c.get('a') // touch a → b becomes LRU
    c.set('c', 3) // evicts b
    expect(c.get('a')).toBe(1)
    expect(c.get('b')).toBeUndefined()
    expect(c.get('c')).toBe(3)
  })

  it('expires entries after the TTL', () => {
    vi.useFakeTimers()
    const c = new LruCache<string, number>(10, 1000)
    c.set('a', 1)
    vi.advanceTimersByTime(999)
    expect(c.get('a')).toBe(1)
    vi.advanceTimersByTime(2)
    expect(c.get('a')).toBeUndefined()
  })

  it('drops expired entries from size accounting on access', () => {
    vi.useFakeTimers()
    const c = new LruCache<string, number>(10, 500)
    c.set('a', 1)
    vi.advanceTimersByTime(600)
    expect(c.get('a')).toBeUndefined()
    expect(c.size).toBe(0)
  })
})

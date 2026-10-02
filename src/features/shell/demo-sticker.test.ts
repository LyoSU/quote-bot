import { describe, expect, it, vi } from 'vitest'

vi.mock('../../services/quote-api/client', () => ({ generateQuote: vi.fn() }))
vi.mock('../../core/logger', () => ({ logger: { child: () => ({ debug: vi.fn() }) } }))
import { DemoStickerCache, demoMessages } from './demo-sticker'

const png = Buffer.from('img')

describe('DemoStickerCache', () => {
  it('renders once, caches the file_id, then resends by id', async () => {
    const render = vi.fn(async () => png)
    const cache = new DemoStickerCache(render)
    const send = vi.fn(async (m: string | Buffer) => (typeof m === 'string' ? m : 'FID'))

    expect(cache.get('uk')).toBeUndefined()
    expect(await cache.deliver('uk', send)).toBe(true)
    expect(cache.get('uk')).toBe('FID')
    expect(await cache.deliver('uk', send)).toBe(true)
    expect(render).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenLastCalledWith('FID')
  })

  it('caches per locale', async () => {
    const render = vi.fn(async () => png)
    const cache = new DemoStickerCache(render)
    await cache.deliver('uk', async () => 'A')
    await cache.deliver('en', async () => 'B')
    expect([cache.get('uk'), cache.get('en')]).toEqual(['A', 'B'])
    expect(render).toHaveBeenCalledTimes(2)
  })

  it('dedupes concurrent renders for one locale', async () => {
    const render = vi.fn(async () => png)
    const cache = new DemoStickerCache(render)
    await Promise.all([cache.deliver('uk', async () => 'A'), cache.deliver('uk', async () => 'A')])
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('swallows render failures silently and caches nothing', async () => {
    const cache = new DemoStickerCache(async () => {
      throw new Error('quote-api down')
    })
    const send = vi.fn()
    expect(await cache.deliver('uk', send)).toBe(false)
    expect(send).not.toHaveBeenCalled()
    expect(cache.get('uk')).toBeUndefined()
  })

  it('re-renders when a cached file_id is rejected', async () => {
    const render = vi.fn(async () => png)
    const cache = new DemoStickerCache(render)
    await cache.deliver('uk', async () => 'OLD')
    const send = vi.fn(async (m: string | Buffer) => {
      if (m === 'OLD') throw new Error('wrong file identifier')
      return 'NEW'
    })
    expect(await cache.deliver('uk', send)).toBe(true)
    expect(cache.get('uk')).toBe('NEW')
    expect(render).toHaveBeenCalledTimes(2)
  })
})

describe('demoMessages', () => {
  it('is a 3-message dialog between two fictional senders, English fallback', () => {
    const msgs = demoMessages('xx')
    expect(msgs).toHaveLength(3)
    expect(new Set(msgs.map((m) => m.from?.id)).size).toBe(2)
    expect(msgs.every((m) => m.from?.synthetic)).toBe(true)
    expect(msgs[0]!.text).toBe(demoMessages('en')[0]!.text)
    expect(msgs[2]!.from?.name).toBe('Alex')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clearSenderColorsCache, resolveSenderColors } from './sender-colors'
import { syntheticId } from './sender'

function api(over: Record<string, unknown> = {}) {
  return {
    getChat: vi.fn(async () => ({ id: 5, accent_color_id: 8, background_custom_emoji_id: 'EMO' })),
    ...over,
  } as never
}
const calls = (a: unknown) => (a as { getChat: ReturnType<typeof vi.fn> }).getChat

beforeEach(() => clearSenderColorsCache())

describe('resolveSenderColors', () => {
  it('maps getChat accent_color_id / background_custom_emoji_id', async () => {
    await expect(resolveSenderColors(api(), 5)).resolves.toEqual({ accentColorId: 8, backgroundEmojiId: 'EMO' })
  })

  it('keeps accent id 0 (a valid color) and omits the missing emoji', async () => {
    const a = api({ getChat: vi.fn(async () => ({ id: 5, accent_color_id: 0 })) })
    await expect(resolveSenderColors(a, 5)).resolves.toEqual({ accentColorId: 0 })
  })

  it('returns undefined when the chat has no colors', async () => {
    const a = api({ getChat: vi.fn(async () => ({ id: 5 })) })
    await expect(resolveSenderColors(a, 5)).resolves.toBeUndefined()
  })

  it('caches per id and shares concurrent lookups', async () => {
    const a = api()
    const [x, y] = await Promise.all([resolveSenderColors(a, 5), resolveSenderColors(a, 5)])
    await resolveSenderColors(a, 5)
    expect(x).toEqual(y)
    expect(calls(a)).toHaveBeenCalledTimes(1)
  })

  it('never calls Telegram for synthetic or zero ids', async () => {
    const a = api()
    await expect(resolveSenderColors(a, syntheticId('Ghost'))).resolves.toBeUndefined()
    await expect(resolveSenderColors(a, 0)).resolves.toBeUndefined()
    expect(calls(a)).not.toHaveBeenCalled()
  })

  it('swallows errors and retries next time (failure is not cached)', async () => {
    const getChat = vi.fn().mockRejectedValueOnce(new Error('flood')).mockResolvedValueOnce({ id: 7, accent_color_id: 3 })
    const a = api({ getChat })
    await expect(resolveSenderColors(a, 7)).resolves.toBeUndefined()
    await Promise.resolve()
    await expect(resolveSenderColors(a, 7)).resolves.toEqual({ accentColorId: 3 })
  })

  it('times out instead of stalling the quote', async () => {
    const a = api({ getChat: vi.fn(() => new Promise(() => {})) })
    await expect(resolveSenderColors(a, 9, 20)).resolves.toBeUndefined()
  })
})

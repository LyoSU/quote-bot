import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clearSenderPhotoCache, resolveSenderPhoto } from './sender-photo'
import { syntheticId } from './sender'

const size = (id: string, w: number, h: number) => ({ file_id: id, file_unique_id: id, width: w, height: h })

function api(over: Record<string, unknown> = {}) {
  return {
    getUserProfilePhotos: vi.fn(async () => ({ total_count: 1, photos: [[size('s', 160, 160), size('l', 640, 640), size('m', 320, 320)]] })),
    getChat: vi.fn(async () => ({ id: -100, photo: { big_file_id: 'chbig' } })),
    ...over,
  } as never
}

beforeEach(() => clearSenderPhotoCache())

describe('resolveSenderPhoto (B2)', () => {
  it('uses the largest size of the current profile photo for a user', async () => {
    const a = api()
    await expect(resolveSenderPhoto(a, 5)).resolves.toEqual({ big_file_id: 'l' })
    expect((a as never as { getUserProfilePhotos: ReturnType<typeof vi.fn> }).getUserProfilePhotos).toHaveBeenCalledWith(5, { limit: 1 })
  })

  it('uses getChat().photo.big_file_id for a channel / chat', async () => {
    const a = api()
    await expect(resolveSenderPhoto(a, -1001234567890)).resolves.toEqual({ big_file_id: 'chbig' })
  })

  it('returns undefined for a user without a photo', async () => {
    const a = api({ getUserProfilePhotos: vi.fn(async () => ({ total_count: 0, photos: [] })) })
    await expect(resolveSenderPhoto(a, 5)).resolves.toBeUndefined()
  })

  it('caches per id and shares concurrent lookups', async () => {
    const a = api()
    const [x, y] = await Promise.all([resolveSenderPhoto(a, 5), resolveSenderPhoto(a, 5)])
    await resolveSenderPhoto(a, 5)
    expect(x).toEqual(y)
    expect((a as never as { getUserProfilePhotos: ReturnType<typeof vi.fn> }).getUserProfilePhotos).toHaveBeenCalledTimes(1)
  })

  it('never calls Telegram for synthetic ids', async () => {
    const a = api()
    await expect(resolveSenderPhoto(a, syntheticId('Ghost'))).resolves.toBeUndefined()
    await expect(resolveSenderPhoto(a, 0)).resolves.toBeUndefined()
    const x = a as never as { getUserProfilePhotos: ReturnType<typeof vi.fn>; getChat: ReturnType<typeof vi.fn> }
    expect(x.getUserProfilePhotos).not.toHaveBeenCalled()
    expect(x.getChat).not.toHaveBeenCalled()
  })

  it('swallows errors and retries on the next call (failure is not cached)', async () => {
    const getUserProfilePhotos = vi
      .fn()
      .mockRejectedValueOnce(new Error('flood'))
      .mockResolvedValueOnce({ total_count: 1, photos: [[size('ok', 100, 100)]] })
    const a = api({ getUserProfilePhotos })
    await expect(resolveSenderPhoto(a, 7)).resolves.toBeUndefined()
    await Promise.resolve()
    await expect(resolveSenderPhoto(a, 7)).resolves.toEqual({ big_file_id: 'ok' })
  })

  it('times out instead of stalling the quote', async () => {
    const a = api({ getUserProfilePhotos: vi.fn(() => new Promise(() => {})) })
    await expect(resolveSenderPhoto(a, 9, 20)).resolves.toBeUndefined()
  })
})

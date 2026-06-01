import { describe, it, expect, vi } from 'vitest'
import type { Api } from 'grammy'
import { StickerService, packName } from './index'

describe('packName', () => {
  it('suffixes the base with the bot username', () => {
    expect(packName('QuotLy_', 'quotlybot')).toBe('QuotLy_quotlybot')
  })
})

describe('StickerService.trimPack', () => {
  it('deletes only stickers beyond the keep count', async () => {
    const stickers = Array.from({ length: 13 }, (_, i) => ({ file_id: `f${i}` }))
    const deleteStickerFromSet = vi.fn(() => Promise.resolve(true))
    const api = {
      getStickerSet: vi.fn(() => Promise.resolve({ stickers })),
      deleteStickerFromSet,
    } as unknown as Api

    await new StickerService(10).trimPack(api, 'pack')

    expect(deleteStickerFromSet).toHaveBeenCalledTimes(3) // 13 - 10
    expect(deleteStickerFromSet).toHaveBeenCalledWith('f10')
    expect(deleteStickerFromSet).toHaveBeenCalledWith('f12')
  })

  it('does nothing when the pack is within the keep count', async () => {
    const deleteStickerFromSet = vi.fn(() => Promise.resolve(true))
    const api = {
      getStickerSet: vi.fn(() => Promise.resolve({ stickers: [{ file_id: 'a' }, { file_id: 'b' }] })),
      deleteStickerFromSet,
    } as unknown as Api

    await new StickerService(10).trimPack(api, 'pack')
    expect(deleteStickerFromSet).not.toHaveBeenCalled()
  })
})

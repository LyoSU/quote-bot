import { describe, it, expect, vi, afterEach } from 'vitest'
import { GrammyError, type Api } from 'grammy'
import { StickerService, packName, PACK_ICON_EMOJI } from './index'

describe('packName', () => {
  it('suffixes the base with the bot username', () => {
    expect(packName('QuotLy_', 'quotlybot')).toBe('QuotLy_quotlybot')
  })
})

/** Service with no real sleeping between visibility polls. */
function instantService(): StickerService {
  return new StickerService({ sleep: async () => {} })
}

function stageParams(): Parameters<StickerService['stageSticker']>[1] {
  return { ownerId: 42, name: 'pack', title: 'Created by @testbot', webp: Buffer.from('webp'), emojis: ['❤️'] }
}

function stickerSetInvalidError(): GrammyError {
  return new GrammyError(
    'Call to addStickerToSet failed!',
    { ok: false, error_code: 400, description: 'Bad Request: STICKERSET_INVALID' },
    'addStickerToSet',
    {},
  )
}

const ICON = { file_id: 'icon', file_unique_id: 'icon-u', emoji: PACK_ICON_EMOJI }
const QUOTE = { file_id: 'q1', file_unique_id: 'q1-u', emoji: '❤️' }

describe('StickerService.stageSticker', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds to the existing pack and returns the staged sticker', async () => {
    const addStickerToSet = vi.fn(() => Promise.resolve(true))
    const createNewStickerSet = vi.fn(() => Promise.resolve(true))
    const getStickerSet = vi.fn(() => Promise.resolve({ stickers: [ICON, QUOTE] }))
    const api = { addStickerToSet, createNewStickerSet, getStickerSet } as unknown as Api

    const staged = await instantService().stageSticker(api, stageParams())

    expect(addStickerToSet).toHaveBeenCalledOnce()
    expect(createNewStickerSet).not.toHaveBeenCalled()
    expect(staged.file_id).toBe('q1')
  })

  it('creates a missing pack with the marker icon first, then the quote', async () => {
    const addStickerToSet = vi.fn(() => Promise.reject(stickerSetInvalidError()))
    const createNewStickerSet = vi.fn(() => Promise.resolve(true))
    const getStickerSet = vi.fn(() => Promise.resolve({ stickers: [ICON, QUOTE] }))
    const api = { addStickerToSet, createNewStickerSet, getStickerSet } as unknown as Api

    await instantService().stageSticker(api, stageParams())

    expect(createNewStickerSet).toHaveBeenCalledOnce()
    const [ownerId, name, title, stickers] = createNewStickerSet.mock.calls[0] as unknown as [
      number,
      string,
      string,
      Array<{ emoji_list: string[] }>,
    ]
    expect(ownerId).toBe(42)
    expect(name).toBe('pack')
    expect(title).toBe('Created by @testbot')
    expect(stickers).toHaveLength(2)
    expect(stickers[0]?.emoji_list).toEqual([PACK_ICON_EMOJI])
    expect(stickers[1]?.emoji_list).toEqual(['❤️'])
  })

  it('retries getStickerSet while the Bot API cache still hides the fresh sticker', async () => {
    const addStickerToSet = vi.fn(() => Promise.resolve(true))
    const getStickerSet = vi
      .fn()
      .mockResolvedValueOnce({ stickers: [ICON] }) // stale cache: add not visible yet
      .mockResolvedValueOnce({ stickers: [ICON, QUOTE] })
    const api = { addStickerToSet, getStickerSet } as unknown as Api

    const staged = await instantService().stageSticker(api, stageParams())

    expect(getStickerSet).toHaveBeenCalledTimes(2)
    expect(staged.file_id).toBe('q1')
  })

  it('gives up when the sticker never becomes visible', async () => {
    const addStickerToSet = vi.fn(() => Promise.resolve(true))
    const getStickerSet = vi.fn(() => Promise.resolve({ stickers: [ICON] }))
    const api = { addStickerToSet, getStickerSet } as unknown as Api

    await expect(instantService().stageSticker(api, stageParams())).rejects.toThrow(/not visible/)
  })

  it('accepts a legacy-shaped pack (no icon) as long as a sticker is there', async () => {
    const addStickerToSet = vi.fn(() => Promise.resolve(true))
    const getStickerSet = vi.fn(() => Promise.resolve({ stickers: [QUOTE] }))
    const api = { addStickerToSet, getStickerSet } as unknown as Api

    const staged = await instantService().stageSticker(api, stageParams())
    expect(staged.file_id).toBe('q1')
  })

  it('schedules a trim whose debounce resets on every stage', async () => {
    vi.useFakeTimers()
    const addStickerToSet = vi.fn(() => Promise.resolve(true))
    const getStickerSet = vi.fn(() => Promise.resolve({ stickers: [ICON, QUOTE] }))
    const deleteStickerFromSet = vi.fn(() => Promise.resolve(true))
    const api = { addStickerToSet, getStickerSet, deleteStickerFromSet } as unknown as Api
    const service = new StickerService({ sleep: async () => {} })

    await service.stageSticker(api, stageParams())
    getStickerSet.mockClear()
    await vi.advanceTimersByTimeAsync(4_000)
    await service.stageSticker(api, stageParams())
    getStickerSet.mockClear()
    await vi.advanceTimersByTimeAsync(4_000)
    expect(getStickerSet).not.toHaveBeenCalled() // друге stage скинуло дебаунс

    await vi.advanceTimersByTimeAsync(1_000)
    expect(getStickerSet).toHaveBeenCalledOnce() // страхувальний trim спрацював
  })
})

describe('StickerService.discardSticker', () => {
  it('deletes the staged sticker and swallows failures', async () => {
    const deleteStickerFromSet = vi.fn(() => Promise.reject(new Error('STICKERSET_INVALID')))
    const api = { deleteStickerFromSet } as unknown as Api

    instantService().discardSticker(api, 'pack', 'q1')
    await vi.waitFor(() => expect(deleteStickerFromSet).toHaveBeenCalledWith('q1'))
  })
})

describe('StickerService.trimPack', () => {
  it('keeps only the marker icon and deletes every staged quote', async () => {
    const stickers = [ICON, QUOTE, { file_id: 'q2', file_unique_id: 'q2-u', emoji: '😀' }]
    const deleteStickerFromSet = vi.fn(() => Promise.resolve(true))
    const api = {
      getStickerSet: vi.fn(() => Promise.resolve({ stickers })),
      deleteStickerFromSet,
    } as unknown as Api

    await instantService().trimPack(api, 'pack')

    expect(deleteStickerFromSet).toHaveBeenCalledTimes(2)
    expect(deleteStickerFromSet).toHaveBeenCalledWith('q1')
    expect(deleteStickerFromSet).toHaveBeenCalledWith('q2')
  })

  it('wipes a legacy-shaped pack (no icon) so it gets recreated with one', async () => {
    const stickers = [QUOTE, { file_id: 'q2', file_unique_id: 'q2-u', emoji: '❤️' }]
    const deleteStickerFromSet = vi.fn(() => Promise.resolve(true))
    const api = {
      getStickerSet: vi.fn(() => Promise.resolve({ stickers })),
      deleteStickerFromSet,
    } as unknown as Api

    await instantService().trimPack(api, 'pack')

    expect(deleteStickerFromSet).toHaveBeenCalledTimes(2)
    expect(deleteStickerFromSet).toHaveBeenCalledWith('q1')
    expect(deleteStickerFromSet).toHaveBeenCalledWith('q2')
  })

  it('does nothing when the pack holds just the icon', async () => {
    const deleteStickerFromSet = vi.fn(() => Promise.resolve(true))
    const api = {
      getStickerSet: vi.fn(() => Promise.resolve({ stickers: [ICON] })),
      deleteStickerFromSet,
    } as unknown as Api

    await instantService().trimPack(api, 'pack')
    expect(deleteStickerFromSet).not.toHaveBeenCalled()
  })
})

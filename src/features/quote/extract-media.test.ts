import { describe, it, expect } from 'vitest'
import { extractMedia } from './extract-media'

const opts = { hasText: false, crop: false }

describe('extractMedia', () => {
  it('returns nothing for a text-only message', () => {
    expect(extractMedia({}, { hasText: true, crop: false })).toEqual({})
  })

  it('sets mediaCrop from the crop flag on text-less media', () => {
    const r = extractMedia({ photo: [{ file_id: 'p', file_unique_id: 'u', width: 1, height: 1 }] }, { hasText: false, crop: true })
    expect(r.mediaCrop).toBe(true)
    expect(r.mediaType).toBe('photo')
  })

  it('still attaches media when the message also has a caption', () => {
    const r = extractMedia(
      { photo: [{ file_id: 'p', file_unique_id: 'u', width: 1, height: 1 }] },
      { hasText: true, crop: false },
    )
    expect(r.mediaType).toBe('photo')
    expect(r.media).toHaveLength(1)
  })

  it('uses the sticker file itself for static stickers', () => {
    const r = extractMedia({ sticker: { file_id: 'sid' } }, opts)
    expect(r.mediaType).toBe('sticker')
    expect(r.media).toEqual([{ file_id: 'sid' }])
    expect(r.stickerIsAnimated).toBe(false)
    expect(r.stickerIsVideo).toBe(false)
  })

  it('uses the thumbnail for animated/video stickers', () => {
    const thumb = { file_id: 't', file_unique_id: 'tu', width: 1, height: 1 }
    const r = extractMedia({ sticker: { file_id: 'sid', is_video: true, thumbnail: thumb } }, opts)
    expect(r.media).toEqual([thumb])
    expect(r.stickerIsVideo).toBe(true)
  })

  it('extracts a video thumbnail', () => {
    const thumb = { file_id: 't', file_unique_id: 'tu', width: 1, height: 1 }
    const r = extractMedia({ video: { file_id: 'v', thumbnail: thumb } }, opts)
    expect(r.mediaType).toBe('video')
    expect(r.media).toEqual([thumb])
  })

  it('extracts voice waveform + duration', () => {
    const r = extractMedia({ voice: { waveform: [1, 2, 3], duration: 5 } }, opts)
    expect(r.voice).toEqual({ waveform: [1, 2, 3], duration: 5 })
  })
})

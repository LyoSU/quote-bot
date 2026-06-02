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

  it('extracts a video thumbnail and keeps the real file id/mime', () => {
    const thumb = { file_id: 't', file_unique_id: 'tu', width: 1, height: 1 }
    const r = extractMedia({ video: { file_id: 'v', mime_type: 'video/mp4', thumbnail: thumb } }, opts)
    expect(r.mediaType).toBe('video')
    expect(r.media).toEqual([thumb])
    expect(r.mediaFileId).toBe('v')
    expect(r.mediaMimeType).toBe('video/mp4')
  })

  it('renders an image document (.gif/.png sent as a file) as a photo', () => {
    const r = extractMedia({ document: { file_id: 'gif', mime_type: 'image/gif', file_name: 'cat.gif' } }, opts)
    expect(r.mediaType).toBe('photo')
    expect(r.media).toEqual([{ file_id: 'gif' }])
    expect(r.mediaFileId).toBe('gif')
    expect(r.mediaFileName).toBe('cat.gif')
  })

  it('renders a thumbnail-less image document by file extension when the mime is missing', () => {
    const r = extractMedia({ document: { file_id: 'gifid', file_name: 'meme.GIF' } }, opts)
    expect(r.mediaType).toBe('photo')
    expect(r.media).toEqual([{ file_id: 'gifid' }])
  })

  it('keeps a non-image document as a document with its thumbnail', () => {
    const thumb = { file_id: 't', file_unique_id: 'tu', width: 1, height: 1 }
    const r = extractMedia({ document: { file_id: 'pdf', mime_type: 'application/pdf', thumbnail: thumb } }, opts)
    expect(r.mediaType).toBe('document')
    expect(r.media).toEqual([thumb])
    expect(r.mediaFileId).toBe('pdf')
  })

  it('emits no media array for an unrenderable document (so the unsupported-text fallback fires)', () => {
    const r = extractMedia({ document: { mime_type: 'application/pdf' } }, opts)
    expect(r.mediaType).toBe('document')
    expect(r.media).toBeUndefined()
  })

  it('emits no media array for a thumbnail-less animation (avoids a blank quote)', () => {
    const r = extractMedia({ animation: { file_id: 'a', mime_type: 'video/mp4' } }, opts)
    expect(r.mediaType).toBe('animation')
    expect(r.media).toBeUndefined() // empty [] would be truthy → blank render
    expect(r.mediaFileId).toBe('a') // still kept for the webapp
  })

  it('surfaces paid photo media + the star price', () => {
    const photo = [{ file_id: 'pp', file_unique_id: 'u', width: 1, height: 1 }]
    const r = extractMedia({ paid_media: { star_count: 50, paid_media: [{ type: 'photo', photo }] } }, opts)
    expect(r.mediaType).toBe('paid_photo')
    expect(r.media).toEqual(photo)
    expect(r.paidStars).toBe(50)
  })

  it('falls back to paid_preview when the item is hidden', () => {
    const r = extractMedia({ paid_media: { star_count: 10, paid_media: [{ type: 'preview' }] } }, opts)
    expect(r.mediaType).toBe('paid_preview')
    expect(r.paidStars).toBe(10)
  })

  it('tags a story forward with its id', () => {
    const r = extractMedia({ story: { id: 7, chat: { id: -100, title: 'Ch' } } }, opts)
    expect(r.mediaType).toBe('story')
    expect(r.storyId).toBe(7)
  })

  it('propagates the media-spoiler and caption-above hints', () => {
    const r = extractMedia(
      { photo: [{ file_id: 'p', file_unique_id: 'u', width: 1, height: 1 }], has_media_spoiler: true, show_caption_above_media: true },
      opts,
    )
    expect(r.hasMediaSpoiler).toBe(true)
    expect(r.captionAboveMedia).toBe(true)
  })

  it('extracts voice waveform + duration', () => {
    const r = extractMedia({ voice: { waveform: [1, 2, 3], duration: 5 } }, opts)
    expect(r.voice).toEqual({ waveform: [1, 2, 3], duration: 5 })
  })
})

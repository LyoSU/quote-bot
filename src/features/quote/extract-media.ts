import type { PhotoSize } from 'grammy/types'
import type { QuoteMediaFile, QuoteMediaType, QuoteMessageMedia, QuoteVoice } from '../../services/quote-api/types'

/** A file with a thumbnail (video/animation/document/audio share this shape). */
interface ThumbedFile {
  file_id?: string
  thumbnail?: PhotoSize
}

/** Structural view of a message's media — both native and TDLib messages satisfy it. */
export interface MediaSource {
  photo?: PhotoSize[]
  sticker?: {
    file_id: string
    is_animated?: boolean
    is_video?: boolean
    thumb?: { file_id: string }
    thumbnail?: PhotoSize
  }
  animation?: ThumbedFile
  video?: ThumbedFile
  video_note?: ThumbedFile
  document?: ThumbedFile
  audio?: ThumbedFile
  voice?: { waveform?: number[]; duration?: number }
}

export interface ExtractedMedia {
  media?: QuoteMessageMedia
  mediaType?: QuoteMediaType
  mediaCrop?: boolean
  stickerIsAnimated?: boolean
  stickerIsVideo?: boolean
  voice?: QuoteVoice
}

export interface ExtractMediaOptions {
  /** Whether the message has visible text/caption (affects crop sizing). */
  hasText: boolean
  /** The `c`/`crop` flag — crop the sticker around a text-less image. */
  crop: boolean
}

function hasAnyMedia(src: MediaSource): boolean {
  return Boolean(
    src.photo ||
      src.sticker ||
      src.animation ||
      src.video ||
      src.video_note ||
      src.document ||
      src.audio ||
      src.voice,
  )
}

function thumbList(file: ThumbedFile | undefined): QuoteMediaFile[] {
  return file?.thumbnail ? [file.thumbnail] : []
}

/**
 * Extracts the renderer-facing media fields from a message.
 *
 * Mirrors Telegram's behavior: captioned media shows BOTH the caption and the
 * media; a text-less media message is cropped around the image. Webapp-only
 * metadata (mime types, file names, story ids, …) is intentionally out of scope
 * here — that belongs to the app feature (#7).
 */
export function extractMedia(src: MediaSource, opts: ExtractMediaOptions): ExtractedMedia {
  const out: ExtractedMedia = {}

  const include = !opts.hasText || hasAnyMedia(src)
  if (!opts.hasText) out.mediaCrop = opts.crop
  if (!include) return out

  if (src.photo) {
    out.media = src.photo
    out.mediaType = 'photo'
  } else if (src.sticker) {
    const s = src.sticker
    const thumb = s.thumb ?? s.thumbnail
    // Animated/video stickers render from the thumbnail; if absent, fall back to
    // the sticker file id so the bubble isn't left empty.
    out.media = s.is_video || s.is_animated ? [thumb ?? { file_id: s.file_id }] : [{ file_id: s.file_id }]
    out.mediaType = 'sticker'
    out.stickerIsAnimated = Boolean(s.is_animated)
    out.stickerIsVideo = Boolean(s.is_video)
  } else if (src.animation) {
    out.media = thumbList(src.animation)
    out.mediaType = 'animation'
  } else if (src.video) {
    out.media = thumbList(src.video)
    out.mediaType = 'video'
  } else if (src.video_note) {
    out.media = thumbList(src.video_note)
    out.mediaType = 'video_note'
  } else if (src.document) {
    out.media = thumbList(src.document)
    out.mediaType = 'document'
  } else if (src.audio) {
    out.media = thumbList(src.audio)
    out.mediaType = 'audio'
  }

  if (src.voice) {
    out.voice = { waveform: src.voice.waveform ?? [], duration: src.voice.duration ?? 0 }
  }

  return out
}

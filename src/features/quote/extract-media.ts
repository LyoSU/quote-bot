import type { PhotoSize } from 'grammy/types'
import type {
  QuoteAudio,
  QuoteDocument,
  QuoteMediaFile,
  QuoteMediaType,
  QuoteMessageMedia,
  QuoteVoice,
} from '../../services/quote-api/types'

/** A file with a thumbnail (video/animation/document/audio share this shape). */
interface ThumbedFile {
  file_id?: string
  mime_type?: string
  file_name?: string
  file_size?: number
  /** Video/animation/audio length, in seconds. */
  duration?: number
  /** Audio tags. */
  title?: string
  performer?: string
  thumbnail?: PhotoSize
}

/** A single item inside a paid-media album (Bot API 7.5+): photo / video / blurred preview. */
interface PaidMediaItem {
  type: string
  photo?: PhotoSize[]
  video?: ThumbedFile
}

/** Structural view of a message's media — both native and server-fetched messages satisfy it. */
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
  voice?: { file_id?: string; mime_type?: string; waveform?: number[]; duration?: number }
  paid_media?: { star_count?: number; paid_media?: PaidMediaItem[] }
  story?: { id?: number; chat?: { id: number; title?: string } }
  /** Telegram "tap to reveal" blur + caption-above-media UI hints. */
  has_media_spoiler?: boolean
  show_caption_above_media?: boolean
}

export interface ExtractedMedia {
  media?: QuoteMessageMedia
  mediaType?: QuoteMediaType
  mediaCrop?: boolean
  /** Video/animation duration (s) — the renderer's play-badge label. */
  mediaDuration?: number
  stickerIsAnimated?: boolean
  stickerIsVideo?: boolean
  /** The real file behind a non-photo bubble — lets the webapp stream the actual video/gif/audio. */
  mediaFileId?: string
  mediaMimeType?: string
  mediaFileName?: string
  /** Paid media (Bot API 7.5+): the unlock price in Telegram Stars. */
  paidStars?: number
  /** Story forward: the source story id (preview is attributed to its chat). */
  storyId?: number
  hasMediaSpoiler?: boolean
  captionAboveMedia?: boolean
  voice?: QuoteVoice
  document?: QuoteDocument
  audio?: QuoteAudio
}

export interface ExtractMediaOptions {
  /** Whether the message has visible text/caption (affects crop sizing). */
  hasText: boolean
  /** The `c`/`crop` flag — crop the sticker around a text-less image. */
  crop: boolean
}

export function hasAnyMedia(src: MediaSource): boolean {
  return Boolean(
    src.photo ||
      src.sticker ||
      src.animation ||
      src.video ||
      src.video_note ||
      src.document ||
      src.audio ||
      src.voice ||
      src.paid_media ||
      src.story,
  )
}

function thumbList(file: ThumbedFile | undefined): QuoteMediaFile[] {
  return file?.thumbnail ? [file.thumbnail] : []
}

const IMAGE_EXT_RE = /\.(gif|png|jpe?g|webp|bmp|tiff?|heic|heif|avif)$/i

/**
 * A document that is really just an image (a .gif/.png/… sent as a file). We
 * detect it by mime first, then by file extension — Telegram sometimes omits or
 * mislabels the mime on documents, so the name is a necessary fallback.
 */
function isImageDocument(d: ThumbedFile): boolean {
  return Boolean(d.mime_type?.startsWith('image/') || (d.file_name && IMAGE_EXT_RE.test(d.file_name)))
}

/** Carries the real file's id/mime/name so the webapp can stream it (and the renderer can fall back to it). */
function fileMeta(out: ExtractedMedia, file: ThumbedFile): void {
  if (file.file_id) out.mediaFileId = file.file_id
  if (file.mime_type) out.mediaMimeType = file.mime_type
  if (file.file_name) out.mediaFileName = file.file_name
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
    const a = src.animation
    // A GIF is an mp4 animation. The renderer paints a static frame from the
    // thumbnail; when Telegram omits it, hand over the file id so the renderer
    // can still try to decode a frame (a real .gif decodes via sharp). Without
    // this the bubble had no media at all and degraded to "unsupported".
    out.media = a.thumbnail ? [a.thumbnail] : a.file_id ? [{ file_id: a.file_id }] : []
    out.mediaType = 'animation'
    if (typeof a.duration === 'number') out.mediaDuration = a.duration
    fileMeta(out, a)
  } else if (src.video) {
    out.media = thumbList(src.video)
    out.mediaType = 'video'
    if (typeof src.video.duration === 'number') out.mediaDuration = src.video.duration
    fileMeta(out, src.video)
  } else if (src.video_note) {
    out.media = thumbList(src.video_note)
    out.mediaType = 'video_note'
    fileMeta(out, src.video_note)
  } else if (src.document) {
    const d = src.document
    if (isImageDocument(d) && d.file_id) {
      // A .gif/.png/.webp sent as a file is just an image — render it as a photo
      // straight from the document's own file id. (Its thumbnail is a tiny static
      // preview and is often absent, which is why the old `[thumbnail]`-only path
      // produced an empty bubble. The renderer fetches the file by id and decodes
      // it via sharp, so animated GIFs render their first frame fine.)
      out.media = [{ file_id: d.file_id }]
      out.mediaType = 'photo'
    } else {
      // A real document (pdf, zip, …) renders as a Telegram-style row (icon +
      // name + size), not a thumbnail bubble — so a thumbnail-less file is no
      // longer "unsupported".
      out.document = {}
      out.mediaType = 'document'
      if (d.file_name) out.document.file_name = d.file_name
      if (typeof d.file_size === 'number') out.document.file_size = d.file_size
    }
    fileMeta(out, d)
  } else if (src.audio) {
    // Audio renders as a Telegram-style row (cover/note disc + title/performer ·
    // duration), with the cover fetched from the thumbnail by file id.
    const a = src.audio
    out.audio = {}
    out.mediaType = 'audio'
    if (a.title) out.audio.title = a.title
    if (a.performer) out.audio.performer = a.performer
    if (typeof a.duration === 'number') out.audio.duration = a.duration
    if (a.thumbnail?.file_id) out.audio.thumb = { file_id: a.thumbnail.file_id }
    fileMeta(out, a)
  } else if (src.paid_media) {
    // Paid media (Bot API 7.5+): surface the first item's preview and the price.
    const first = src.paid_media.paid_media?.[0]
    if (first?.type === 'photo' && first.photo) {
      out.media = first.photo
      out.mediaType = 'paid_photo'
    } else if (first?.type === 'video' && first.video?.thumbnail) {
      out.media = [first.video.thumbnail]
      out.mediaType = 'paid_video'
    } else {
      out.mediaType = 'paid_preview'
    }
    if (typeof src.paid_media.star_count === 'number') out.paidStars = src.paid_media.star_count
  } else if (src.story) {
    // A story forward carries no preview bytes — tag it; the sender is resolved
    // to the story's chat upstream (assemble).
    out.mediaType = 'story'
    if (typeof src.story.id === 'number') out.storyId = src.story.id
  }

  if (src.voice) {
    out.voice = { waveform: src.voice.waveform ?? [], duration: src.voice.duration ?? 0 }
    if (src.voice.file_id) out.voice.fileId = src.voice.file_id
    if (src.voice.mime_type) out.voice.mimeType = src.voice.mime_type
  }

  // An empty media array is still truthy: it would both suppress the
  // "unsupported message" text fallback AND make the renderer enter its media
  // branch with `media[0] === undefined`, producing a blank quote. Drop it so a
  // thumbnail-less video/animation/document degrades to text (or unsupported).
  if (Array.isArray(out.media) && out.media.length === 0) out.media = undefined

  if (src.has_media_spoiler) out.hasMediaSpoiler = true
  if (src.show_caption_above_media) out.captionAboveMedia = true

  return out
}

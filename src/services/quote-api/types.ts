import type { MessageEntity } from 'grammy/types'

/** Output kind requested from the renderer. */
export type QuoteType = 'quote' | 'image' | 'stories'
/** Encoding of the rendered image. */
export type QuoteFormat = 'webp' | 'png'

export type QuoteMediaType =
  | 'photo'
  | 'sticker'
  | 'animation'
  | 'video'
  | 'video_note'
  | 'document'
  | 'audio'
  | 'paid_photo'
  | 'paid_video'
  | 'paid_preview'
  | 'story'

export interface QuoteFromPhoto {
  small_file_id?: string
  small_file_unique_id?: string
  big_file_id?: string
  big_file_unique_id?: string
  /** Direct URL avatar (used for synthetic senders). */
  url?: string
}

export interface QuoteMessageFrom {
  id: number
  /** Display name. `false` suppresses the name (streak continuation). */
  name?: string | false
  first_name?: string
  last_name?: string
  username?: string | null
  photo?: QuoteFromPhoto
  emoji_status?: string
  author_signature?: string
}

export interface QuoteMediaFile {
  file_id?: string
  file_unique_id?: string
  width?: number
  height?: number
  duration?: number
  is_animated?: boolean
  is_video?: boolean
  thumb?: { file_id?: string }
  waveform?: number[]
}

/** Main-message media: an array of file variants (photo sizes, a sticker, a thumbnail…). */
export type QuoteMessageMedia = QuoteMediaFile[]

export type QuoteReplyMediaKind =
  | 'photo'
  | 'sticker'
  | 'animation'
  | 'video'
  | 'video_note'
  | 'voice'
  | 'audio'
  | 'document'

export interface QuoteReplyMedia {
  kind: QuoteReplyMediaKind
  fileId?: string
  duration?: number
}

export interface QuoteReplyMessage {
  name?: string
  chatId?: number
  text?: string
  entities?: MessageEntity[]
  media?: QuoteReplyMedia
}

/** Forwarded-message info. The renderer reads `label`; the rest feeds the archive/webapp. */
export interface QuoteForward {
  label: string
  name?: string
  from?: { id?: number; username?: string; kind?: 'user' | 'chat' | 'hidden' }
}

/** A single message in the quote, in the shape the renderer (quote-api) reads. */
export interface QuoteMessage {
  message_id?: number
  /** Original Telegram timestamp (unix s). Ignored by the renderer; used for archiving. */
  date?: number
  chatId?: number
  avatar?: boolean
  isQuote?: boolean
  forward?: QuoteForward
  from?: QuoteMessageFrom
  text?: string
  entities?: MessageEntity[]
  media?: QuoteMessageMedia
  mediaType?: QuoteMediaType
  mediaCrop?: boolean
  stickerIsAnimated?: boolean
  stickerIsVideo?: boolean
  /** Real file behind a non-photo bubble (video/gif/audio) — for the webapp player + renderer fallback. */
  mediaFileId?: string
  mediaMimeType?: string
  mediaFileName?: string
  /** Paid media (Bot API 7.5+) unlock price, in Telegram Stars. */
  paidStars?: number
  /** Story forward: the source story id. */
  storyId?: number
  /** Telegram UI hints preserved for the webapp. */
  hasMediaSpoiler?: boolean
  captionAboveMedia?: boolean
  voice?: QuoteVoice
  senderTag?: string
  /** Inline-bot attribution — renderer shows a grey "via @bot" next to the name. */
  viaBot?: string
  replyMessage?: QuoteReplyMessage
}

export interface QuoteVoice {
  waveform: number[]
  duration: number
}

export interface QuoteGenerationRequest {
  type: QuoteType
  format?: QuoteFormat
  backgroundColor?: string
  width?: number
  height?: number
  scale?: number
  emojiBrand?: string
  messages: QuoteMessage[]
}

export interface QuoteGenerationResult {
  /** Raw image bytes. */
  image: Buffer
  /** Effective type from the `quote-type` response header (may differ, e.g. png fallback). */
  quoteType: string
  width?: number
  height?: number
}

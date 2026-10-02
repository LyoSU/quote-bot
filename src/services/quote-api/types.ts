import type { MessageEntity } from 'grammy/types'
import type { QuoteSpecialFields } from './special-types'

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

/** Telegram profile colors of a sender (Bot API `accent_color_id` / `background_custom_emoji_id`). */
export interface QuoteSenderColors {
  /** 0–6 single color, 7–13 two-color, 14–20 three-color. */
  accentColorId?: number
  /** custom_emoji_id of the profile background emoji (reply-chip pattern). */
  backgroundEmojiId?: string
}

export interface QuoteMessageFrom extends QuoteSenderColors {
  id: number
  /** Display name. `false` suppresses the name (streak continuation). */
  name?: string | false
  first_name?: string
  last_name?: string
  username?: string | null
  photo?: QuoteFromPhoto
  emoji_status?: string
  author_signature?: string
  /** Made-up id (hidden sender): the renderer must never look it up on Telegram. */
  synthetic?: boolean
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

/** One tile of an album (several photos/videos sent together) — the renderer lays them out as a mosaic. */
export interface QuoteAlbumItem {
  file_id?: string
  url?: string
  width?: number
  height?: number
  type: 'photo' | 'video' | 'animation'
  /** Video length (s) — the tile's duration badge. */
  duration?: number
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
  /** Reply to a story: the renderer draws a story ring instead of a thumbnail. */
  | 'story'

export interface QuoteReplyMedia {
  kind: QuoteReplyMediaKind
  fileId?: string
  duration?: number
}

export interface QuoteReplyMessage extends QuoteSenderColors {
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

/**
 * A single message in the quote, in the shape the renderer (quote-api) reads.
 * Card payloads (checklist/gift/giveaway/story) + forum topic: special-types.ts.
 */
export interface QuoteMessage extends QuoteSpecialFields {
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
  /** Media group (2–10 items): replaces `media`; caption stays in `text`. */
  album?: QuoteAlbumItem[]
  mediaType?: QuoteMediaType
  mediaCrop?: boolean
  /** Video/animation duration (s) — the renderer's play-badge label. */
  mediaDuration?: number
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
  /** Non-image file → renderer draws a Telegram-style document row. */
  document?: QuoteDocument
  /** Audio file → renderer draws a Telegram-style audio row. */
  audio?: QuoteAudio
  senderTag?: string
  /** Who carries the tag: owner/admin render as purple/green pills, member as plain text. */
  senderTagRole?: QuoteSenderTagRole
  /** Inline-bot attribution — renderer shows a grey "via @bot" next to the name. */
  viaBot?: string
  replyMessage?: QuoteReplyMessage
  /** Rich Message (Bot API 10.1+) blocks; `text`/`entities` carry a flattened fallback. */
  rich?: import('./rich-types').QuoteRich
}

export interface QuoteVoice {
  /** Absent for official Bot API voices (no waveform) — the renderer draws a synthetic one. */
  waveform?: number[]
  duration: number
  /** Archive-only playback metadata consumed by quotly-webapp. */
  fileId?: string
  mimeType?: string
}

export interface QuoteDocument {
  file_name?: string
  file_size?: number
}

export interface QuoteAudio {
  title?: string
  performer?: string
  duration?: number
  /** Cover art — the renderer fetches it by file id. */
  thumb?: { file_id?: string }
}

export interface QuoteGenerationRequest {
  type: QuoteType
  format?: QuoteFormat
  backgroundColor?: string
  width?: number
  height?: number
  scale?: number
  emojiBrand?: string
  /** Bubble style preset ('glass' | 'classic'); older renderers ignore it. */
  style?: string
  /** Image/stories wallpaper ('doodle' | 'mesh' | 'aurora'); older renderers ignore it. */
  backdrop?: string
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

export type QuoteSenderTagRole = 'owner' | 'admin' | 'member'

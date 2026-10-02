import type { MessageEntity } from 'grammy/types'
import type {
  QuoteForward,
  QuoteMessage,
  QuoteMessageFrom,
  QuoteReplyMedia,
  QuoteReplyMessage,
  QuoteSenderTagRole,
} from '../../services/quote-api/types'
import { extractMedia, type MediaSource } from './extract-media'
import type { PartialQuoteMode } from './render'
import { DEFAULT_LABELS, hasSpecialContent, specialText, type QuoteLabels, type SpecialSource } from './labels'
import { composeName, isSyntheticId, syntheticId, type ChatLike, type OriginLike, type Sender } from './sender'
import { applyRich, richPreviewText, type RichSource } from './rich'
import { applySpecialTypes } from './special-types'

/**
 * The replied-to message. Media is a preview only (webapp); the renderer
 * ignores it. The sender/forward fields let us attribute the reply block.
 */
export interface ReplySource extends SpecialSource, RichSource {
  message_id?: number
  date?: number
  text?: string
  caption?: string
  entities?: MessageEntity[]
  caption_entities?: MessageEntity[]
  /**
   * Present when this message was itself a reply-with-quote — a fragment of
   * ITS parent. Matters once the message is promoted to a quote source
   * (`reply as RawMessage` in select); the reply block itself ignores it.
   */
  quote?: { text: string; entities?: MessageEntity[] }
  photo?: { file_id: string }[]
  sticker?: { thumb?: { file_id: string }; thumbnail?: { file_id: string } }
  animation?: { thumbnail?: { file_id: string } }
  video?: { thumbnail?: { file_id: string } }
  video_note?: { thumbnail?: { file_id: string } }
  voice?: { duration?: number }
  audio?: { duration?: number }
  document?: { thumbnail?: { file_id: string }; file_name?: string }
  story?: unknown
  // Sender attribution (read by resolveReplyFrom).
  from?: Sender & { is_bot?: boolean }
  sender_chat?: ChatLike & { title?: string }
  forward_from?: Sender & { is_bot?: boolean }
  forward_from_chat?: ChatLike & { title?: string }
  forward_sender_name?: string
  forward_origin?: OriginLike
  origin?: OriginLike
}

/** Structural view of the source message buildQuoteMessage consumes. */
export interface QuoteSource extends MediaSource, SpecialSource, RichSource {
  message_id?: number
  text?: string
  caption?: string
  entities?: MessageEntity[]
  caption_entities?: MessageEntity[]
  /** Manual fragment selection from the `/q` trigger — a fragment of THIS message's text. */
  selection?: { text: string; entities?: MessageEntity[] }
  /**
   * The message's own reply-with-quote (Bot API `quote`) — a fragment of its
   * PARENT message, i.e. someone else's words. Shown on the reply block only,
   * never as this message's body.
   */
  quote?: { text: string; entities?: MessageEntity[] }
  reply_to_message?: ReplySource
  sender_tag?: string
  author_signature?: string
  via_bot?: { username?: string }
  date?: number
}

export interface BuildQuoteMessageParams {
  source: QuoteSource
  /** Effective sender, already resolved (forward attribution, hidden enrichment). */
  from: Sender
  /** Resolved reply sender, or null. */
  replyFrom?: Sender | null
  /** First message of a same-sender streak shows the name; the rest suppress it. */
  isFirstInStreak: boolean
  /** Render the replied-to message block (the `reply` flag). */
  showReply: boolean
  /** Forward info (groups only). */
  forward?: QuoteForward
  /** The `crop` flag. */
  crop: boolean
  /** The `m | media` flag: keep media even for a partial quote. */
  forceMedia: boolean
  /** Localized fallback text for unsupported content. */
  unsupportedText: string
  /** Localized labels (reply to a text-less message, location, …). English when omitted. */
  labels?: QuoteLabels
  /** How to treat a manual partial-quote selection. Defaults to `framed`. */
  quoteMode?: PartialQuoteMode
  /** Render the author's role/title (admin custom title / signature). Defaults to true. */
  showSenderTag?: boolean
  /** Verified tag/title of the quoted author, resolved upstream. No sender fallback. */
  authorTag?: string
  /** Role behind authorTag — styles the tag (owner/admin pill, member plain). */
  authorTagRole?: QuoteSenderTagRole
}

function replyMediaKind(reply: ReplySource): QuoteReplyMedia | undefined {
  if (reply.photo) return { kind: 'photo', fileId: reply.photo[0]?.file_id }
  if (reply.sticker) return { kind: 'sticker', fileId: reply.sticker.thumb?.file_id ?? reply.sticker.thumbnail?.file_id }
  if (reply.animation) return { kind: 'animation', fileId: reply.animation.thumbnail?.file_id }
  if (reply.video) return { kind: 'video', fileId: reply.video.thumbnail?.file_id }
  if (reply.video_note) return { kind: 'video_note', fileId: reply.video_note.thumbnail?.file_id }
  if (reply.voice) return { kind: 'voice', duration: reply.voice.duration }
  if (reply.audio) return { kind: 'audio', duration: reply.audio.duration }
  if (reply.document) return { kind: 'document', fileId: reply.document.thumbnail?.file_id }
  return undefined
}

/**
 * What to show in a reply block when the replied message has no text/caption:
 * a poll question / venue / contact name where there is one, otherwise a
 * localized kind label ("Photo", "Voice message", …).
 */
function replyLabel(reply: ReplySource, labels: QuoteLabels): string | undefined {
  const k = labels.kinds
  if (reply.photo) return k.photo
  if (reply.sticker) return k.sticker
  if (reply.animation) return k.gif
  if (reply.video) return k.video
  if (reply.video_note) return k.video_note
  if (reply.voice) return k.voice
  if (reply.audio) return k.audio
  if (reply.document) return reply.document.file_name || k.document
  if (reply.poll) return `📊 ${reply.poll.question || k.poll}`
  if (reply.dice?.emoji) return reply.dice.emoji
  if (reply.venue || reply.location || reply.contact) return specialText(reply, labels)?.text.split('\n')[0]
  if (reply.story) return k.story
  return undefined
}

export function buildReplyMessage(
  reply: ReplySource,
  from: Sender | null,
  quote?: { text: string; entities?: MessageEntity[] },
  labels: QuoteLabels = DEFAULT_LABELS,
): QuoteReplyMessage {
  const name = from ? composeName(from) : undefined
  const out: QuoteReplyMessage = {}
  if (name !== undefined) out.name = name
  if (from) out.chatId = from.id ?? syntheticId(name ?? '')
  if (from?.accentColorId !== undefined) out.accentColorId = from.accentColorId
  if (from?.backgroundEmojiId) out.backgroundEmojiId = from.backgroundEmojiId
  // A reply-with-quote shows the quoted fragment, like Telegram's own header.
  // Its entities replace the reply's: those offsets index into the full text.
  const ownText = quote?.text || reply.text || reply.caption || richPreviewText(reply, labels) || undefined
  // A reply to a text-less message (photo, sticker, voice, …) shows a localized
  // kind label — the renderer drops reply blocks with no text.
  out.text = ownText ?? replyLabel(reply, labels)
  out.entities = quote ? quote.entities : ownText ? (reply.entities ?? reply.caption_entities) : undefined
  const media = replyMediaKind(reply)
  if (media) out.media = media
  return out
}

/**
 * Assembles a single {@link QuoteMessage} from a source message and already
 * resolved senders. Pure — all DB/server resolution happens upstream.
 */
export function buildQuoteMessage(params: BuildQuoteMessageParams): QuoteMessage {
  const { source, from, replyFrom, isFirstInStreak, showReply, forward, crop, forceMedia, unsupportedText } = params
  const labels = params.labels ?? DEFAULT_LABELS
  const quoteMode = params.quoteMode ?? 'framed'

  // Text: caption wins over text; an explicit quote selection wins over both.
  let text = source.text
  let entities = source.entities
  if (source.caption) {
    text = source.caption
    entities = source.caption_entities
  }

  const out: QuoteMessage = { avatar: true }
  if (typeof source.message_id === 'number') out.message_id = source.message_id
  if (typeof source.date === 'number') out.date = source.date

  // `off` quotes the whole message — pretend there's no manual selection.
  const selection = quoteMode === 'off' ? undefined : source.selection
  if (selection) {
    text = selection.text
    entities = selection.entities
    // `plain` shows the fragment without the quote frame/highlight.
    if (quoteMode === 'framed') out.isQuote = true
  }

  // A partial quote is about the selected text — drop the media (Telegram
  // behaves the same), unless the user explicitly asked for it with `m`.
  if (!selection || forceMedia) {
    Object.assign(out, extractMedia(source, { hasText: Boolean(text), crop }))
    if (source.album?.length) out.album = source.album
  }

  const name = composeName(from)
  const fromOut: QuoteMessageFrom = {
    id: from.id ?? syntheticId(name ?? ''),
    username: from.username,
    photo: from.photo,
    emoji_status: from.emoji_status,
    first_name: from.first_name,
    last_name: from.last_name,
  }
  if (isFirstInStreak) {
    fromOut.name = name
  } else {
    if (!fromOut.first_name && name) {
      const parts = name.split(' ')
      fromOut.first_name = parts[0]
      if (parts.length > 1) fromOut.last_name = parts.slice(1).join(' ')
    }
    fromOut.name = false
  }
  if (isSyntheticId(fromOut.id)) fromOut.synthetic = true
  if (from.accentColorId !== undefined) fromOut.accentColorId = from.accentColorId
  if (from.backgroundEmojiId) fromOut.backgroundEmojiId = from.backgroundEmojiId
  out.from = fromOut
  out.chatId = fromOut.id

  if (params.authorTag && params.showSenderTag !== false) {
    out.senderTag = params.authorTag
    if (params.authorTagRole) out.senderTagRole = params.authorTagRole
  }

  if (source.via_bot?.username) out.viaBot = source.via_bot.username

  if (text) out.text = text
  if (entities) out.entities = entities
  // Rich Message (Bot API 10.1+): blocks + flattened fallback text + its media.
  if (!selection) applyRich(out, source, { labels, crop })

  out.replyMessage =
    showReply && source.reply_to_message
      ? buildReplyMessage(source.reply_to_message, replyFrom ?? null, source.quote, labels)
      : {}

  if (forward) out.forward = forward

  // Checklist / gift / giveaway / story cards, forum topic header (special-types.ts).
  applySpecialTypes(out, source, { labels, showReply, selection: Boolean(selection) })

  // Poll / dice / location / contact: no text or media of their own — quote
  // them as a short text line instead of "unsupported".
  if (!out.text && !out.media && !out.album && !out.voice && !out.document && !out.audio && hasSpecialContent(source)) {
    const special = specialText(source, labels)
    if (special) {
      out.text = special.text
      if (special.entities?.length) out.entities = special.entities
    }
  }

  if (!out.text && !out.media && !out.album && !out.voice && !out.document && !out.audio) {
    out.text = unsupportedText
    out.entities = [{ type: 'italic', offset: 0, length: unsupportedText.length }]
  }

  return out
}

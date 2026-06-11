import type { MessageEntity } from 'grammy/types'
import type {
  QuoteForward,
  QuoteMessage,
  QuoteMessageFrom,
  QuoteReplyMedia,
  QuoteReplyMessage,
} from '../../services/quote-api/types'
import { extractMedia, type MediaSource } from './extract-media'
import { composeName, hashCode, type ChatLike, type OriginLike, type Sender } from './sender'

/**
 * The replied-to message. Media is a preview only (webapp); the renderer
 * ignores it. The sender/forward fields let us attribute the reply block.
 */
export interface ReplySource {
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
  document?: { thumbnail?: { file_id: string } }
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
export interface QuoteSource extends MediaSource {
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

export function buildReplyMessage(
  reply: ReplySource,
  from: Sender | null,
  quote?: { text: string; entities?: MessageEntity[] },
): QuoteReplyMessage {
  const name = from ? composeName(from) : undefined
  const out: QuoteReplyMessage = {}
  if (name !== undefined) out.name = name
  if (from) out.chatId = from.id ?? hashCode(name ?? '')
  // A reply-with-quote shows the quoted fragment, like Telegram's own header.
  // Its entities replace the reply's: those offsets index into the full text.
  out.text = quote?.text || reply.text || reply.caption || undefined
  out.entities = quote ? quote.entities : (reply.entities ?? reply.caption_entities)
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
  if (source.selection) {
    text = source.selection.text
    entities = source.selection.entities
    out.isQuote = true
  }

  // A partial quote is about the selected text — drop the media (Telegram
  // behaves the same), unless the user explicitly asked for it with `m`.
  if (!source.selection || forceMedia) {
    Object.assign(out, extractMedia(source, { hasText: Boolean(text), crop }))
  }

  const name = composeName(from)
  const fromOut: QuoteMessageFrom = {
    id: from.id ?? hashCode(name ?? ''),
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
  out.from = fromOut
  out.chatId = fromOut.id

  const senderTag = source.sender_tag ?? source.author_signature ?? from.author_signature
  if (senderTag) out.senderTag = senderTag

  if (source.via_bot?.username) out.viaBot = source.via_bot.username

  if (text) out.text = text
  if (entities) out.entities = entities

  out.replyMessage =
    showReply && source.reply_to_message
      ? buildReplyMessage(source.reply_to_message, replyFrom ?? null, source.quote)
      : {}

  if (forward) out.forward = forward

  if (!out.text && !out.media && !out.voice && !out.document && !out.audio) {
    out.text = unsupportedText
    out.entities = [{ type: 'italic', offset: 0, length: unsupportedText.length }]
  }

  return out
}

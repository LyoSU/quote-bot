import type { QuoteFromPhoto } from '../../services/quote-api/types'

/**
 * Internal "sender" shape used while building a quote — a superset of the
 * fields we read from users, chats and forward origins. Resolved down to a
 * {@link QuoteMessageFrom} when the message is assembled.
 */
export interface Sender {
  id?: number
  name?: string
  first_name?: string
  last_name?: string
  username?: string | null
  title?: string
  author_signature?: string
  emoji_status?: string
  photo?: QuoteFromPhoto
  /** Profile accent color / background emoji (resolved via getChat; never on messages). */
  accentColorId?: number
  backgroundEmojiId?: string
}

/** A chat-like object (native Chat or TdChat). */
export interface ChatLike {
  id: number
  title?: string
  username?: string | null
  photo?: QuoteFromPhoto
}

/** A forward origin (native Bot API `forward_origin` or our TdForwardOrigin). */
export interface OriginLike {
  type: 'user' | 'hidden_user' | 'chat' | 'channel' | string
  sender_user?: Sender
  sender_chat?: Sender
  chat?: Sender
  sender_user_name?: string
  author_signature?: string
}

/**
 * Deterministic 32-bit string hash — the seed of {@link syntheticId}, which
 * gives senders we can't identify (hidden-user forwards) a stable pseudo-id so
 * the renderer assigns them a consistent avatar color.
 */
export function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return h
}

/**
 * Synthetic ids live far below every real Telegram id (users are positive,
 * supergroups/channels bottom out around -2.0e12), so a made-up id for a hidden
 * sender can never collide with — or trigger lookups on — a real account.
 * The base is a multiple of 7, so `abs(id) % 7` (the renderer's color index)
 * equals the legacy `abs(hashCode(name)) % 7` and hidden senders keep their colors.
 */
const SYNTHETIC_BASE = 2_100_000_000_000

/** Stable pseudo-id for a sender we can only identify by display name. */
export function syntheticId(name: string): number {
  return -(SYNTHETIC_BASE + Math.abs(hashCode(name)))
}

/** True for ids produced by {@link syntheticId} — never look these up on Telegram. */
export function isSyntheticId(id: number | undefined | null): boolean {
  return typeof id === 'number' && id <= -SYNTHETIC_BASE
}

/**
 * Composes a sender's display name from the available fields, matching the
 * legacy precedence: title → first_name (+ last_name) override a raw `name`.
 */
export function composeName(sender: Sender): string | undefined {
  let name = sender.name
  if (sender.title) name = sender.title
  if (sender.first_name) name = sender.first_name
  if (sender.last_name) name = name ? `${name} ${sender.last_name}` : sender.last_name
  return name
}

/** Synthetic sender from a display name only. */
export function stubFromName(name: string): Sender {
  return { id: syntheticId(name), name }
}

/** Sender derived from a chat (channel / group / sender_chat). */
export function senderFromChat(chat: ChatLike): Sender {
  return {
    id: chat.id,
    name: chat.title,
    username: chat.username ?? null,
    photo: chat.photo,
  }
}

/**
 * Resolves a forward origin to a {@link Sender}. Handles all four Bot API
 * origin types; returns null if the origin is missing or unrecognized so
 * callers can fall through to legacy fields.
 */
export function resolveMessageOrigin(origin: OriginLike | undefined | null): Sender | null {
  if (!origin) return null

  if (origin.type === 'user' && origin.sender_user) {
    return origin.sender_user
  }
  if (origin.type === 'hidden_user') {
    return { id: syntheticId(origin.sender_user_name ?? ''), name: origin.sender_user_name }
  }
  if (origin.type === 'chat' && origin.sender_chat) {
    return { ...origin.sender_chat, ...(origin.author_signature ? { author_signature: origin.author_signature } : {}) }
  }
  if (origin.type === 'channel' && origin.chat) {
    return { ...origin.chat, ...(origin.author_signature ? { author_signature: origin.author_signature } : {}) }
  }
  return null
}

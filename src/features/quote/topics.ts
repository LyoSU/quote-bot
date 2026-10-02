import { LruCache } from '../../core/lru'
import type { QuoteTopic } from '../../services/quote-api/special-types'

/**
 * Forum topic names for the quote header.
 *
 * The Bot API puts a topic's name only on its `forum_topic_created` service
 * message (and on `forum_topic_edited`). Every non-reply message in a topic
 * carries that service message as its `reply_to_message` (the topic root),
 * so most quotes can read the name straight off the root; for the rest, this
 * process-local LRU remembers what passed by in the update stream.
 */

/** Bot API ForumTopicCreated (structural; grammY may lag). */
export interface ForumTopicCreatedLike {
  name: string
  icon_color?: number
  icon_custom_emoji_id?: string
}

/** Bot API ForumTopicEdited: only the changed fields are present. */
export interface ForumTopicEditedLike {
  name?: string
  /** Empty string = the icon was removed. */
  icon_custom_emoji_id?: string
}

/** The fields of a message the topic logic reads. */
export interface TopicMessageLike {
  message_thread_id?: number
  is_topic_message?: boolean
  chat?: { id: number }
  forum_topic_created?: ForumTopicCreatedLike
  forum_topic_edited?: ForumTopicEditedLike
  reply_to_message?: { message_id?: number; forum_topic_created?: ForumTopicCreatedLike }
}

/** ~5k topics × a short name: a few hundred KB at most. Names rarely change. */
const cache = new LruCache<string, QuoteTopic>(5_000, 7 * 24 * 60 * 60 * 1000)

const key = (chatId: number, threadId: number): string => `${chatId}:${threadId}`

/** RGB24 int → '#rrggbb'. Bot API colors are ints; out-of-range values are rejected. */
export function rgbToHex(value: number | undefined): string | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 0xffffff) return undefined
  return `#${value.toString(16).padStart(6, '0')}`
}

export function topicFromCreated(t: ForumTopicCreatedLike): QuoteTopic | undefined {
  if (!t.name) return undefined
  const out: QuoteTopic = { name: t.name }
  const color = rgbToHex(t.icon_color)
  if (color) out.iconColor = color
  if (t.icon_custom_emoji_id) out.iconEmojiId = t.icon_custom_emoji_id
  return out
}

/**
 * True when a message's `reply_to_message` is only its forum topic root — the
 * implicit link every non-reply topic message carries — not a real reply.
 */
export function isTopicRoot(reply: unknown): boolean {
  return Boolean(reply && typeof reply === 'object' && (reply as TopicMessageLike).forum_topic_created)
}

/**
 * Feeds the cache from one incoming message. Cheap (a couple of property
 * reads), safe to call for every group message on the hot path.
 *
 * The topic's own service messages are authoritative; a topic root seen on a
 * regular message only seeds a missing entry (it holds the ORIGINAL name, so
 * it must never overwrite a later edit).
 */
export function recordTopic(msg: TopicMessageLike | undefined): void {
  if (!msg?.chat || typeof msg.message_thread_id !== 'number') return
  const k = key(msg.chat.id, msg.message_thread_id)
  if (msg.forum_topic_created) {
    const t = topicFromCreated(msg.forum_topic_created)
    if (t) cache.set(k, t)
    return
  }
  if (msg.forum_topic_edited) {
    const prev = cache.get(k)
    const e = msg.forum_topic_edited
    const name = e.name || prev?.name
    if (!name) return
    const next: QuoteTopic = { ...prev, name }
    if (e.icon_custom_emoji_id !== undefined) {
      if (e.icon_custom_emoji_id) next.iconEmojiId = e.icon_custom_emoji_id
      else delete next.iconEmojiId
    }
    cache.set(k, next)
    return
  }
  const root = msg.reply_to_message?.forum_topic_created
  if (root && !cache.get(k)) {
    const t = topicFromCreated(root)
    if (t) cache.set(k, t)
  }
}

export function lookupTopic(chatId: number, threadId: number): QuoteTopic | undefined {
  return cache.get(key(chatId, threadId))
}

/**
 * The forum topic a message belongs to: the cache first (it follows renames),
 * then the topic root on the message itself. Undefined outside forum topics
 * (the General topic has no thread id and no root).
 */
export function resolveTopic(msg: TopicMessageLike): QuoteTopic | undefined {
  const root = msg.reply_to_message?.forum_topic_created
  if (!root && !msg.is_topic_message) return undefined
  if (msg.chat && typeof msg.message_thread_id === 'number') {
    const hit = lookupTopic(msg.chat.id, msg.message_thread_id)
    if (hit) return hit
  }
  return root ? topicFromCreated(root) : undefined
}

/**
 * A topic header is shown once per run: consecutive messages of the same
 * topic keep it only on the first one.
 */
export function dedupeTopics(messages: { topic?: QuoteTopic }[]): void {
  let prev: string | undefined
  for (const m of messages) {
    const name = m.topic?.name
    if (name !== undefined && name === prev) delete m.topic
    prev = name
  }
}

/** Test hook. */
export function clearTopicCache(): void {
  cache.clear()
}

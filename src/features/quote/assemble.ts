import type { QuoteForward, QuoteFromPhoto, QuoteMessage } from '../../services/quote-api/types'
import { mergeAlbums } from './album'
import { buildQuoteMessage, type QuoteSource, type ReplySource } from './build-message'
import { DEFAULT_LABELS, type QuoteLabels } from './labels'
import type { PartialQuoteMode } from './render'
import {
  resolveMessageOrigin,
  isSyntheticId,
  senderFromChat,
  stubFromName,
  type ChatLike,
  type OriginLike,
  type Sender,
} from './sender'

interface RawSender extends Sender {
  is_bot?: boolean
}

/** Structural source message — both native Bot API and ApiMessage satisfy it. */
export interface RawMessage extends QuoteSource {
  message_id?: number
  /** Channel post auto-forwarded into its linked discussion group (not a user forward). */
  is_automatic_forward?: boolean
  from?: RawSender
  sender_chat?: ChatLike & { title?: string }
  forward_from?: RawSender
  forward_from_chat?: ChatLike & { title?: string }
  forward_sender_name?: string
  forward_origin?: OriginLike
  origin?: OriginLike
}

export interface AssembleDeps {
  chatType: string
  hidden: boolean
  crop: boolean
  /** The `m | media` flag: keep media even for a partial quote. */
  forceMedia: boolean
  /** Render the replied-to message block (the `reply` flag). */
  showReply: boolean
  unsupportedText: string
  /** Localized labels (forward header, reply-to-media kinds, …). English when omitted. */
  labels?: QuoteLabels
  /**
   * Profile photo of a user (positive id) or chat/channel (negative id) — the
   * Bot API never includes it on messages. Best-effort, cached by the caller;
   * never invoked for synthetic ids.
   */
  getSenderPhoto?: (telegramId: number) => Promise<QuoteFromPhoto | undefined>
  /** Resolve a hidden-user forward by display name (DB lookup). */
  enrichHidden: (name: string) => Promise<Sender | null>
  /** Whether a quoted user enabled privacy mode. */
  isUserPrivate: (telegramId: number) => Promise<boolean>
  /**
   * Premium emoji status (custom_emoji_id) for a user — served by the custom
   * Bot API server's getUserInfo, never present on native updates. Best-effort.
   */
  getUserEmojiStatus: (telegramId: number) => Promise<string | undefined>
  /** Group-level privacy (forces anonymization for the whole quote). */
  groupPrivacy: boolean
  /** Render the author's role/title (admin custom title / author signature) top-right. */
  showSenderTag: boolean
  /** Best-effort tag/custom title of the original author in the current group. */
  getAuthorTag: (telegramId: number) => Promise<string | undefined>
  /** Owner/admin status of a user in the current group (undefined = regular member or unknown). */
  getAuthorRole?: (telegramId: number) => Promise<'owner' | 'admin' | undefined>
  /** Localized default labels for owners/admins without a custom title, like Telegram's. */
  roleLabels?: { owner: string; admin: string }
  /**
   * Whether a user is a known member of the current group. Used to attribute a
   * forward to its original author (instead of the forwarder + label) when that
   * author belongs to this group. Never called in private chats.
   */
  isGroupMember: (telegramId: number) => Promise<boolean>
  /** How to treat a manual partial-quote selection (group/user setting). */
  quoteMode: PartialQuoteMode
}

export interface AssembledQuote {
  messages: QuoteMessage[]
  /** True if any quoted user (or the group) requested privacy. */
  privacy: boolean
}

function isForwarded(raw: RawMessage): boolean {
  // A channel post auto-forwarded into its linked discussion group is shown by
  // Telegram as authored by the channel, not as a "Forwarded from" message — so
  // we don't tag it as a forward (no label, channel stays the plain author).
  if (raw.is_automatic_forward) return false
  return Boolean(raw.forward_from || raw.forward_from_chat || raw.forward_sender_name || raw.forward_origin)
}

/** Builds the "Forwarded from X" info (groups only). */
function buildForward(raw: RawMessage, labels: QuoteLabels): QuoteForward | undefined {
  let name = ''
  let from: QuoteForward['from']

  const origin = raw.forward_origin
  if (origin) {
    if (origin.type === 'user' && origin.sender_user) {
      const u = origin.sender_user
      name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.title || ''
      from = { id: u.id, username: u.username ?? undefined, kind: 'user' }
    } else if (origin.type === 'hidden_user') {
      name = origin.sender_user_name ?? ''
      from = { kind: 'hidden' }
    } else if (origin.type === 'chat' || origin.type === 'channel') {
      const c = origin.chat ?? origin.sender_chat
      if (c) {
        name = c.title ?? ''
        from = { id: c.id, username: c.username ?? undefined, kind: 'chat' }
      }
    }
  }

  if (!from) {
    if (raw.forward_from) {
      name = [raw.forward_from.first_name, raw.forward_from.last_name].filter(Boolean).join(' ') || raw.forward_from.title || ''
      from = { id: raw.forward_from.id, username: raw.forward_from.username ?? undefined, kind: 'user' }
    } else if (raw.forward_from_chat) {
      name = raw.forward_from_chat.title ?? ''
      from = { id: raw.forward_from_chat.id, username: raw.forward_from_chat.username ?? undefined, kind: 'chat' }
    } else if (raw.forward_sender_name) {
      name = raw.forward_sender_name
      from = { kind: 'hidden' }
    }
  }

  return { label: name ? labels.forwardedFrom(name) : labels.forwardedMessage, name: name || undefined, from }
}

/** Telegram id of a forward's original author, only when it is an identifiable user. */
function forwardOriginUserId(raw: RawMessage): number | undefined {
  const origin = raw.forward_origin ?? raw.origin
  if (origin?.type === 'user' && origin.sender_user?.id) return origin.sender_user.id
  if (raw.forward_from?.id) return raw.forward_from.id
  return undefined
}

/**
 * Whether a forward originated from a chat/channel rather than a user. Such a
 * forward has no real "forwarder" — the channel IS the author — so we attribute
 * the quote to it directly (no forwarder, no label), like an auto-forward.
 */
function isChannelForward(raw: RawMessage): boolean {
  const origin = raw.forward_origin ?? raw.origin
  if (origin?.type === 'channel' || origin?.type === 'chat') return true
  return !origin && Boolean(raw.forward_from_chat)
}

/** Resolve the effective sender for a message (forward attribution + hidden enrichment). */
async function resolveSender(raw: RawMessage, deps: AssembleDeps): Promise<Sender> {
  // A forwarded story is attributed to the story's chat, not the forwarder.
  if (raw.story?.chat) return senderFromChat(raw.story.chat)

  const mainOrigin = raw.forward_origin ?? raw.origin
  let from = resolveMessageOrigin(mainOrigin)

  const fwdName = raw.forward_sender_name
  if (deps.hidden && fwdName && (mainOrigin?.type === 'hidden_user' || !from)) {
    from = await deps.enrichHidden(fwdName)
  }

  if (!from) {
    if (fwdName) from = stubFromName(fwdName)
    else if (raw.forward_from_chat) from = raw.forward_from_chat
    else if (raw.forward_from) from = raw.forward_from
    else if (raw.sender_chat) from = senderFromChat(raw.sender_chat)
    else if (raw.from) from = raw.from
  }

  return from ?? {}
}

/** Resolve author roles without using a forwarded message's outer sender role fields. */
async function resolveAuthorTag(raw: RawMessage, deps: AssembleDeps): Promise<string | undefined> {
  if (!deps.showSenderTag || raw.story?.chat) return undefined

  const origin = raw.forward_origin ?? raw.origin
  if (origin?.type === 'chat' || origin?.type === 'channel') return origin.author_signature

  if (origin || raw.forward_from || raw.forward_from_chat || raw.forward_sender_name) {
    const authorId = forwardOriginUserId(raw)
    if (authorId === undefined || deps.chatType === 'private') return undefined
    return deps.getAuthorTag(authorId).catch(() => undefined)
  }

  // With no forward, the message's sender is its author.
  return raw.sender_tag ?? raw.author_signature
}

/** The quoted author's group role, mirroring resolveAuthorTag's author choice. */
async function resolveAuthorRole(raw: RawMessage, deps: AssembleDeps): Promise<'owner' | 'admin' | undefined> {
  if (!deps.showSenderTag || !deps.getAuthorRole || raw.story?.chat || deps.chatType === 'private') return undefined

  const origin = raw.forward_origin ?? raw.origin
  // Channel/chat posts carry an author signature, which has no role.
  if (origin?.type === 'chat' || origin?.type === 'channel') return undefined

  const forwarded = origin || raw.forward_from || raw.forward_from_chat || raw.forward_sender_name
  const authorId = forwarded ? forwardOriginUserId(raw) : raw.from?.id
  if (authorId === undefined) return undefined
  return deps.getAuthorRole(authorId).catch(() => undefined)
}

/**
 * Turns the selected source messages into the renderer's QuoteMessage[]:
 * resolves senders, detects same-sender streaks (name shown once, avatar
 * de-duped), applies forward labels and privacy. The pure per-message assembly
 * lives in {@link buildQuoteMessage}.
 */
export async function assembleQuoteMessages(
  sources: RawMessage[],
  deps: AssembleDeps,
): Promise<AssembledQuote> {
  const isPrivateChat = deps.chatType === 'private'
  const labels = deps.labels ?? DEFAULT_LABELS
  let privacy = deps.groupPrivacy
  let lastSenderId: number | null = null

  const messages: QuoteMessage[] = []

  const merged = mergeAlbums(sources)

  // Profile photos: kick every lookup off up-front so they run in parallel with
  // each other and with the per-message awaits below (the resolver caches, so
  // the later `await` in the loop just joins the in-flight promise).
  if (deps.getSenderPhoto) {
    for (const raw of merged) for (const id of photoCandidateIds(raw)) void deps.getSenderPhoto(id).catch(() => undefined)
  }
  const withPhoto = async (s: Sender): Promise<Sender> => {
    if (!deps.getSenderPhoto || s.photo?.big_file_id || s.photo?.url) return s
    if (typeof s.id !== 'number' || s.id === 0 || isSyntheticId(s.id)) return s
    const photo = await deps.getSenderPhoto(s.id).catch(() => undefined)
    return photo ? { ...s, photo } : s
  }

  // Album members collapse into one message (also covers PM batches).
  for (const raw of merged) {
    if (raw.message_id === undefined) continue

    let from = await resolveSender(raw, deps)

    // Premium emoji status rides next to the name; the Bot API never
    // includes it, so resolve through the Bot API server (positive id = real user).
    if (!from.emoji_status && typeof from.id === 'number' && from.id > 0) {
      const status = await deps.getUserEmojiStatus(from.id)
      if (status) from = { ...from, emoji_status: status }
    }

    const forwarded = isForwarded(raw) && !isPrivateChat

    // When the forward's original author is a member of this group, attribute
    // the quote to that author directly (no forwarder, no label) — as if the
    // message were posted here. Falls back to forwarder attribution otherwise.
    let attributeToOrigin = false
    if (forwarded) {
      if (isChannelForward(raw)) {
        // A channel/chat forward is always shown as authored by that channel.
        attributeToOrigin = true
      } else {
        const originUserId = forwardOriginUserId(raw)
        if (originUserId !== undefined) attributeToOrigin = await deps.isGroupMember(originUserId)
      }
    }

    const groupForwarder = forwarded && !attributeToOrigin ? (raw.sender_chat ?? raw.from) : null
    const effectiveSenderId = groupForwarder?.id ?? from.id ?? null
    const isFirstInStreak = lastSenderId === null || effectiveSenderId !== lastSenderId

    // Quote-level privacy: any quoted user (or the group) can request it.
    if (!privacy && from.id && !isSyntheticId(from.id)) {
      if (await deps.isUserPrivate(from.id)) privacy = true
    }

    const forward = forwarded && !attributeToOrigin ? buildForward(raw, labels) : undefined
    const displayFromBase: Sender = groupForwarder
      ? {
          id: groupForwarder.id,
          first_name: 'first_name' in groupForwarder ? groupForwarder.first_name : groupForwarder.title,
          last_name: 'last_name' in groupForwarder ? groupForwarder.last_name : undefined,
          username: groupForwarder.username,
          photo: groupForwarder.photo,
        }
      : from
    const displayFrom = await withPhoto(displayFromBase)

    // A forwarder header must not display either the forwarder's role or the
    // original author's role under the forwarder's name.
    const authorTag = groupForwarder ? undefined : await resolveAuthorTag(raw, deps)
    const authorRole = groupForwarder ? undefined : await resolveAuthorRole(raw, deps)
    // Owners/admins without a custom title still get Telegram's default label.
    const tagText = authorTag ?? (authorRole ? deps.roleLabels?.[authorRole] : undefined)

    messages.push(
      buildQuoteMessage({
        source: raw,
        from: displayFrom,
        replyFrom:
          deps.showReply && raw.reply_to_message ? await resolveReplyFrom(raw.reply_to_message, deps) : null,
        isFirstInStreak,
        showReply: deps.showReply,
        forward,
        crop: deps.crop,
        forceMedia: deps.forceMedia,
        unsupportedText: deps.unsupportedText,
        labels,
        quoteMode: deps.quoteMode,
        showSenderTag: deps.showSenderTag,
        authorTag: tagText,
        authorTagRole: tagText ? (authorRole ?? 'member') : undefined,
      }),
    )

    lastSenderId = effectiveSenderId
  }

  // Avatar shown once per consecutive same-sender streak.
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i]!.chatId === messages[i + 1]!.chatId) messages[i]!.avatar = false
  }

  return { messages, privacy }
}

/** Ids whose profile photo the quote may need: the author and, for a forward shown under the forwarder, the forwarder. */
function photoCandidateIds(raw: RawMessage): number[] {
  const ids = new Set<number>()
  const add = (id: number | undefined): void => {
    if (typeof id === 'number' && id !== 0 && !isSyntheticId(id)) ids.add(id)
  }
  add(raw.from?.id)
  add(raw.sender_chat?.id)
  add(raw.story?.chat?.id)
  const origin = raw.forward_origin ?? raw.origin
  add(origin?.sender_user?.id)
  add(origin?.sender_chat?.id)
  add(origin?.chat?.id)
  add(raw.forward_from?.id)
  add(raw.forward_from_chat?.id)
  return [...ids]
}

/** The reply block carries its own forward attribution. */
async function resolveReplyFrom(reply: ReplySource, deps: AssembleDeps): Promise<Sender | null> {
  const origin = reply.forward_origin ?? reply.origin
  let from = resolveMessageOrigin(origin)
  const fwdName = reply.forward_sender_name
  if (deps.hidden && fwdName && (origin?.type === 'hidden_user' || !from)) {
    from = await deps.enrichHidden(fwdName)
  }
  if (!from) {
    if (fwdName) from = stubFromName(fwdName)
    else if (reply.forward_from_chat) from = reply.forward_from_chat
    else if (reply.forward_from) from = reply.forward_from
    else if (reply.sender_chat) from = senderFromChat(reply.sender_chat)
    else if (reply.from) from = reply.from
  }
  return from
}

import type * as Td from 'tdlib-types'
import { logger } from '../../core/logger'
import { onShutdown } from '../../core/shutdown'
import { LruCache } from '../../core/lru'
import { tdlibClient } from './client'
import { mapChatType, normalizeContent, toBotApiMessageId, toTdlibMessageId } from './normalize'
import type { TdChat, TdForwardOrigin, TdForwardOriginType, TdMessage, TdUser } from './types'

const log = logger.child({ module: 'tdlib' })

/**
 * Resolved chat/user cache. getMessages issues 2–3 getChat per message
 * (sender, chat, forwarder); for a 50-message forward batch that's ~150
 * identical round-trips. A short TTL collapses the batch to a handful of real
 * calls. Bounded (unlike the old unbounded Map + setInterval sweeper).
 */
const chatCache = new LruCache<number, TdChat>(5_000, 60_000)

function usernameOf(usernames: Td.usernames | undefined): string | undefined {
  if (!usernames) return undefined
  return usernames.editable_username || usernames.active_usernames[0]
}

/**
 * In-process TDLib service. Returns Bot-API-shaped data so downstream code
 * handles TDLib-sourced messages exactly like native updates. When TDLib is
 * disabled or unavailable, read methods degrade gracefully (empty/undefined)
 * rather than throwing into handlers.
 */
class TdlibService {
  /** Kick off the connection in the background; never blocks bot startup. */
  init(): void {
    if (!tdlibClient.enabled) {
      log.info('TDLib disabled (no credentials or DISABLE_TDLIB set)')
      return
    }
    onShutdown('tdlib', () => tdlibClient.close())
    void tdlibClient.connect().catch((err) => log.error({ err }, 'Initial TDLib connection failed'))
  }

  isHealthy(): boolean {
    return tdlibClient.isHealthy()
  }

  reconnect(): Promise<void> {
    return tdlibClient.reconnect()
  }

  async getUser(userId: number): Promise<TdUser | undefined> {
    try {
      const u = await tdlibClient.run('getUser', (c) => c.invoke({ _: 'getUser', user_id: userId }))
      return {
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name || undefined,
        username: usernameOf(u.usernames),
        emoji_status:
          u.emoji_status?.type._ === 'emojiStatusTypeCustomEmoji'
            ? u.emoji_status.type.custom_emoji_id
            : undefined,
      }
    } catch (err) {
      log.debug({ err, userId }, 'getUser failed')
      return undefined
    }
  }

  async getChat(chatId: number): Promise<TdChat | undefined> {
    const cached = chatCache.get(chatId)
    if (cached) return cached

    let raw: Td.chat
    try {
      raw = await tdlibClient.run('getChat', (c) => c.invoke({ _: 'getChat', chat_id: chatId }))
    } catch (err) {
      log.debug({ err, chatId }, 'getChat failed')
      return undefined
    }

    const chat: TdChat = { id: raw.id, title: raw.title, type: mapChatType(raw.type) }
    if (raw.photo) {
      chat.photo = {
        small_file_id: raw.photo.small.remote.id,
        small_file_unique_id: raw.photo.small.remote.unique_id,
        big_file_id: raw.photo.big.remote.id,
        big_file_unique_id: raw.photo.big.remote.unique_id,
      }
    }

    if (chat.type === 'private' || chat.type === 'secret') {
      // In TDLib a private chat's id equals the user's id.
      const user = await this.getUser(chat.id)
      if (user) Object.assign(chat, user, { id: chat.id, type: chat.type, title: chat.title })
    } else if (raw.type._ === 'chatTypeSupergroup') {
      try {
        const sg = await tdlibClient.run('getSupergroup', (c) =>
          c.invoke({ _: 'getSupergroup', supergroup_id: raw.type._ === 'chatTypeSupergroup' ? raw.type.supergroup_id : 0 }),
        )
        chat.username = usernameOf(sg.usernames)
      } catch {
        // username is best-effort
      }
    }

    chatCache.set(chatId, chat)
    return chat
  }

  /** Fetch messages by their Bot-API ids and return them in Bot API shape. */
  async getMessages(chatId: number, messageIds: number[]): Promise<TdMessage[]> {
    if (!tdlibClient.enabled || messageIds.length === 0) return []

    let raw: Td.messages
    try {
      raw = await tdlibClient.run('getMessages', (c) =>
        c.invoke({ _: 'getMessages', chat_id: chatId, message_ids: messageIds.map(toTdlibMessageId) }),
      )
    } catch (err) {
      // "Chat not found" is expected: the TDLib user account isn't a member of
      // this group, so it can't read history — the caller falls back to the
      // single native message. Not actionable → debug, not warn.
      const expected = err instanceof Error && /chat not found/i.test(err.message)
      log[expected ? 'debug' : 'warn']({ err, chatId }, 'getMessages failed')
      return []
    }

    const present = (raw.messages ?? []).filter((m): m is Td.message => m != null)
    const built = await Promise.all(present.map((m) => this.buildMessage(chatId, m)))
    return built
  }

  private async buildMessage(chatId: number, info: Td.message): Promise<TdMessage> {
    const message: TdMessage = {
      message_id: toBotApiMessageId(info.id),
      date: info.date,
      ...normalizeContent(info.content),
    }

    // Reply (depth 1).
    if (info.reply_to?._ === 'messageReplyToMessage' && info.reply_to.message_id) {
      const replyChat = info.reply_to.chat_id || chatId
      const [reply] = await this.getMessages(replyChat, [toBotApiMessageId(info.reply_to.message_id)]).catch(() => [])
      if (reply) message.reply_to_message = reply
    }

    // Chat + sender.
    message.chat = await this.getChat(info.chat_id)
    if (info.sender_id._ === 'messageSenderUser') message.from = await this.getChat(info.sender_id.user_id)
    else if (info.sender_id._ === 'messageSenderChat') message.from = await this.getChat(info.sender_id.chat_id)

    // Forward.
    if (info.forward_info) await this.applyForward(message, info.forward_info)

    // Author signature.
    if (info.author_signature) {
      message.author_signature = info.author_signature
      message.sender_tag = info.author_signature
    }

    return message
  }

  private async applyForward(message: TdMessage, forward: Td.messageForwardInfo): Promise<void> {
    const origin = forward.origin
    const ORIGIN_TYPE: Record<Td.MessageOrigin['_'], TdForwardOriginType> = {
      messageOriginUser: 'user',
      messageOriginHiddenUser: 'hidden_user',
      messageOriginChat: 'chat',
      messageOriginChannel: 'channel',
    }

    const forwardOrigin: TdForwardOrigin = { type: ORIGIN_TYPE[origin._], date: forward.date }

    if (origin._ === 'messageOriginUser') {
      const sender = await this.getChat(origin.sender_user_id)
      if (sender) {
        message.forward_from = sender
        forwardOrigin.sender_user = sender
      }
    } else if (origin._ === 'messageOriginHiddenUser') {
      message.forward_sender_name = origin.sender_name
      forwardOrigin.sender_user_name = origin.sender_name
    } else if (origin._ === 'messageOriginChat') {
      const sender = await this.getChat(origin.sender_chat_id)
      if (sender) {
        message.forward_from_chat = sender
        forwardOrigin.sender_chat = sender
      }
      if (origin.author_signature) forwardOrigin.author_signature = origin.author_signature
    } else {
      const channel = await this.getChat(origin.chat_id)
      if (channel) {
        message.forward_from_chat = channel
        forwardOrigin.chat = channel
      }
      if (origin.author_signature) forwardOrigin.author_signature = origin.author_signature
    }

    message.forward_origin = forwardOrigin
  }
}

export const tdlib = new TdlibService()
export { TdlibUnavailableError, TdlibTimeoutError } from './client'
export type { TdMessage, TdUser, TdChat } from './types'

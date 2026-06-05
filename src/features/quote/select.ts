import type { RawMessage } from './assemble'
import type { TdMessage } from '../../services/tdlib'

/** The subset of the TDLib service the selector needs (kept small for testing). */
export interface MessageFetcher {
  isHealthy(): boolean
  getMessages(chatId: number, messageIds: number[]): Promise<TdMessage[]>
}

export interface SelectParams {
  /** The command/forward/guest message that triggered the quote. */
  trigger: RawMessage & {
    external_reply?: RawMessage
    quote?: { text: string; entities?: import('grammy/types').MessageEntity[] }
  }
  chatId: number
  isPrivate: boolean
  isGuest: boolean
  /** `flag.count` (negative = quote backwards). */
  count?: number
  /**
   * The `r | reply` flag. The Bot API only nests `reply_to_message` one
   * level deep, so showing the quoted message's own reply block requires a
   * TDLib fetch even for a single message.
   */
  needReply?: boolean
  fetcher: MessageFetcher
}

export interface Selection {
  /** Source messages in chronological order; empty if nothing to quote. */
  messages: RawMessage[]
}

const MAX_MESSAGES = 50

function clampCount(raw: number | undefined): { count: number; backwards: boolean } {
  let count = raw ?? 1
  const backwards = count < 0
  count = Math.min(Math.abs(count) || 1, MAX_MESSAGES)
  return { count, backwards }
}

/**
 * Decides which source messages a `/q` covers and fetches the extra ones via
 * TDLib when a count > 1 is requested.
 *
 * The matrix (ported from the legacy handler, minus the AI path):
 *   - reply present              → start at the replied message
 *   - private chat, no reply     → quote the trigger message itself
 *   - group, no reply            → nothing (caller shows `empty_forward`)
 *   - external reply (channel…)  → quote that, tagged with the trigger id
 *   - guest / count==1 / no TDLib→ just the rich native message
 *   - otherwise                  → TDLib range fetch, native message as fallback
 */
export async function selectSourceMessages(params: SelectParams): Promise<Selection> {
  const { trigger, chatId, isPrivate, isGuest, fetcher } = params
  const { count, backwards } = clampCount(params.count)

  const reply = trigger.reply_to_message

  // An external reply (a message in a chat the bot isn't in) is quoted directly,
  // carrying the trigger's id + manual quote selection.
  if (!reply && trigger.external_reply) {
    const ext: RawMessage = { ...trigger.external_reply, message_id: trigger.message_id }
    if (trigger.quote) ext.quote = trigger.quote
    return { messages: [ext] }
  }

  let firstMessage: RawMessage | undefined
  if (reply?.message_id) firstMessage = reply as RawMessage
  else if (isPrivate) firstMessage = trigger

  if (!firstMessage || firstMessage.message_id === undefined) return { messages: [] }

  // Single message — keep the native object (richest entities/media).
  // A manual quote selection (message.quote) always belongs to the quoted
  // message — in the same-chat case that's the reply itself (a Bot API
  // `quote` only ever appears on reply messages).
  if (isGuest || count === 1 || !fetcher.isHealthy()) {
    // The r flag needs the quoted message's own reply linkage, which the
    // native object never carries — graft it from TDLib onto the native
    // message (still the richer base). Best-effort: TDLib down → no block.
    if (params.needReply && !isGuest && fetcher.isHealthy() && !firstMessage.reply_to_message) {
      const [fetched] = await fetcher
        .getMessages(chatId, [firstMessage.message_id])
        .catch(() => [] as TdMessage[])
      if (fetched?.reply_to_message) {
        firstMessage = { ...firstMessage, reply_to_message: fetched.reply_to_message }
      }
    }
    if (trigger.quote) firstMessage = { ...firstMessage, quote: trigger.quote }
    return { messages: [firstMessage] }
  }

  const startId = backwards ? firstMessage.message_id - (count - 1) : firstMessage.message_id
  const ids = Array.from({ length: count }, (_, i) => startId + i)

  const fetched = await fetcher.getMessages(chatId, ids).catch(() => [] as TdMessage[])
  const messages: RawMessage[] = fetched.length > 0 ? fetched : [firstMessage]

  if (trigger.quote && messages[0]) messages[0] = { ...messages[0], quote: trigger.quote }
  return { messages }
}

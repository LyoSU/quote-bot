import type { RawMessage } from './assemble'
import type { ApiMessage } from '../../services/bot-api'

/** The subset of the Bot API service the selector needs (kept small for testing). */
export interface MessageFetcher {
  isHealthy(): boolean
  getMessages(chatId: number, messageIds: number[]): Promise<ApiMessage[]>
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
   * The `r | reply` flag. Native updates only nest `reply_to_message` one
   * level deep, so showing the quoted message's own reply block requires a
   * server-side fetch even for a single message.
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
 * the Bot API server's getMessages when a count > 1 is requested.
 *
 * The matrix (ported from the legacy handler, minus the AI path):
 *   - reply present              → start at the replied message
 *   - private chat, no reply     → quote the trigger message itself
 *   - group, no reply            → nothing (caller shows `empty_forward`)
 *   - external reply (channel…)  → quote that, tagged with the trigger id
 *   - guest / count==1 / no srv  → just the rich native message
 *   - otherwise                  → server range fetch, native message as fallback
 */
export async function selectSourceMessages(params: SelectParams): Promise<Selection> {
  const { trigger, chatId, isPrivate, isGuest, fetcher } = params
  const { count, backwards } = clampCount(params.count)

  const reply = trigger.reply_to_message
  // The trigger's `quote` is always a fragment of the message it REPLIES to —
  // with no reply linkage it can't describe anything we're about to quote.
  const selection = reply ? trigger.quote : undefined

  // An external reply (a message in a chat the bot isn't in) is quoted directly,
  // carrying the trigger's id + manual quote selection.
  if (!reply && trigger.external_reply) {
    const ext: RawMessage = { ...trigger.external_reply, message_id: trigger.message_id }
    if (trigger.quote) ext.selection = trigger.quote
    return { messages: [ext] }
  }

  let firstMessage: RawMessage | undefined
  if (reply?.message_id) firstMessage = reply as RawMessage
  else if (isPrivate) firstMessage = trigger

  if (!firstMessage || firstMessage.message_id === undefined) return { messages: [] }

  // Single message — keep the native object (richest entities/media).
  // The TRIGGER's `quote` is the user's manual selection — a fragment of the
  // replied (quoted) message, carried as `selection`. A `quote` already on the
  // source itself means something else entirely: that message quoted a
  // fragment of ITS parent — buildQuoteMessage shows it on the reply block.
  if (isGuest || count === 1 || !fetcher.isHealthy()) {
    // The r flag needs the quoted message's own reply linkage, which the
    // native object never carries — graft it from a server fetch onto the
    // native message (still the richer base). Best-effort: server can't see
    // it → no block.
    if (params.needReply && !isGuest && fetcher.isHealthy() && !firstMessage.reply_to_message) {
      const [fetched] = await fetcher
        .getMessages(chatId, [firstMessage.message_id])
        .catch(() => [] as ApiMessage[])
      if (fetched?.reply_to_message) {
        firstMessage = { ...firstMessage, reply_to_message: fetched.reply_to_message }
      }
    }
    if (selection) firstMessage = { ...firstMessage, selection }
    return { messages: [firstMessage] }
  }

  const startId = backwards ? firstMessage.message_id - (count - 1) : firstMessage.message_id
  const ids = Array.from({ length: count }, (_, i) => startId + i)

  const fetched = await fetcher.getMessages(chatId, ids).catch(() => [] as ApiMessage[])
  const messages: RawMessage[] = fetched.length > 0 ? fetched : [firstMessage]

  // The selection belongs to the replied message — in a backwards range
  // that's the LAST of the fetched ids, not messages[0].
  if (selection) {
    const anchorId = firstMessage.message_id
    const i = messages.findIndex((m) => m.message_id === anchorId)
    if (i !== -1) messages[i] = { ...messages[i], selection }
  }
  return { messages }
}

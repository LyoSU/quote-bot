import type { BotContext } from '../../core/types'
import type { RawMessage } from './assemble'
import { parseQuoteArgs } from './parse-args'

type Flag = ReturnType<typeof parseQuoteArgs>
type RenderFn = (ctx: BotContext, sources: RawMessage[], flag: Flag) => Promise<void>

/** A private-chat message that may start or extend a batch. */
type BatchTrigger = RawMessage & {
  media_group_id?: string
  forward_from?: unknown
  forward_from_chat?: unknown
  forward_sender_name?: string
  forward_origin?: unknown
}

interface PendingBatch {
  ctx: BotContext
  messages: RawMessage[]
  render: RenderFn
  timer: ReturnType<typeof setTimeout>
}

/** How long to wait for more forwards/album parts before rendering the batch. */
const WINDOW_MS = 600
/** Matches the legacy `maxQuoteMessage` cap. */
const MAX_MESSAGES = 50

function isForward(msg: BatchTrigger): boolean {
  return Boolean(msg.forward_origin || msg.forward_from || msg.forward_from_chat || msg.forward_sender_name)
}

function isQCommand(msg: BatchTrigger): boolean {
  return /^\/q(@|\s|$)/i.test(msg.text ?? '')
}

/**
 * Coalesces a burst of forwarded messages / album parts in a private chat into
 * a single quote.
 *
 * Telegram delivers each forwarded message (and each album item) as its own
 * update with no "this is the last one" signal, so the only way to merge them
 * is a short debounce. Because the per-chat `sequentialize` middleware processes
 * updates one at a time, the handler must NOT await — it appends to an in-memory
 * buffer and returns immediately; a timer renders the batch once the burst
 * settles. A `/q` typed during the window flushes the batch early with its flags
 * (so "forward, then /q rate" yields one rated quote, not two).
 */
class PmBatcher {
  private readonly batches = new Map<number, PendingBatch>()

  /**
   * @returns true if the message was consumed (buffered or flushed a batch) and
   *   the caller should stop; false to render it inline as usual.
   */
  handle(ctx: BotContext, trigger: BatchTrigger, flag: Flag, render: RenderFn): boolean {
    const chatId = ctx.chat?.id
    if (chatId === undefined) return false
    const pending = this.batches.get(chatId)

    // A `/q` command: flush any pending batch now, applying its flags. With no
    // batch waiting, let normal command handling proceed.
    if (isQCommand(trigger)) {
      if (!pending) return false
      this.flush(chatId, flag)
      return true
    }

    // Only forwards and album parts batch; a plain typed message renders inline.
    if (!isForward(trigger) && trigger.media_group_id === undefined) return false

    if (pending) {
      pending.ctx = ctx
      if (pending.messages.length < MAX_MESSAGES) pending.messages.push(trigger)
      if (pending.messages.length >= MAX_MESSAGES) {
        this.flush(chatId)
        return true
      }
      this.arm(chatId, pending)
    } else {
      const batch: PendingBatch = { ctx, messages: [trigger], render, timer: setTimeout(() => {}, 0) }
      this.batches.set(chatId, batch)
      this.arm(chatId, batch)
    }
    return true
  }

  /** (Re)start the debounce timer for a batch. */
  private arm(chatId: number, batch: PendingBatch): void {
    clearTimeout(batch.timer)
    batch.timer = setTimeout(() => this.flush(chatId), WINDOW_MS)
    batch.timer.unref?.()
  }

  /** Render the batched messages as one quote and clear the buffer. */
  private flush(chatId: number, flagOverride?: Flag): void {
    const batch = this.batches.get(chatId)
    if (!batch) return
    clearTimeout(batch.timer)
    this.batches.delete(chatId)
    const flag = flagOverride ?? parseQuoteArgs('')
    void batch.render(batch.ctx, batch.messages, flag).catch(() => {})
  }
}

export const pmBatcher = new PmBatcher()

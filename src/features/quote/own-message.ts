/** Structural view of the replied-to message the self-quote guard inspects. */
export interface OwnReplySource {
  from?: { id: number; is_bot?: boolean }
  /** Caller attribution the Bot API server stamps on messages the guest bot itself sent. */
  guest_bot_caller_user?: { id: number }
  guest_bot_caller_chat?: { id: number }
}

/**
 * True when a mention trigger (guest mode, or the group `@bot` alias) replies
 * to a message the bot itself delivered — almost always its own quote sticker.
 * Quoting it again would render a quote of the quote, and each new mention
 * would extend the chain (the quote loop), so callers drop such triggers
 * silently. An explicit `/q` is exempt — quote-of-quote stays possible there.
 *
 * Two markers, either suffices: the sender is the bot, or the message carries
 * the `guest_bot_caller_*` attribution the server only puts on guest-bot sends.
 */
export function isOwnMessage(reply: OwnReplySource, meId: number | undefined): boolean {
  if (meId !== undefined && reply.from?.id === meId) return true
  return Boolean(reply.guest_bot_caller_user || reply.guest_bot_caller_chat)
}

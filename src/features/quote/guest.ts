/** Structural view of the replied-to message the guest guard inspects. */
export interface GuestReplySource {
  from?: { id: number; is_bot?: boolean }
  /** Caller attribution the Bot API server stamps on messages the guest bot itself sent. */
  guest_bot_caller_user?: { id: number }
  guest_bot_caller_chat?: { id: number }
}

/**
 * True when a guest-mode trigger replies to a message the bot itself delivered
 * — almost always its own quote sticker. Quoting it again would render a quote
 * of the quote, and each new mention would extend the chain (the quote loop),
 * so the caller drops such triggers silently.
 *
 * Two markers, either suffices: the sender is the bot, or the message carries
 * the `guest_bot_caller_*` attribution the server only puts on guest-bot sends.
 */
export function isOwnGuestMessage(reply: GuestReplySource, meId: number | undefined): boolean {
  if (meId !== undefined && reply.from?.id === meId) return true
  return Boolean(reply.guest_bot_caller_user || reply.guest_bot_caller_chat)
}

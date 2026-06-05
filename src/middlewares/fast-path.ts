import type { NextFunction } from 'grammy'
import type { BotContext } from '../core/types'
import { updatesTotal } from '../core/metrics'
import { considerGab, recordActivity } from '../services/gab'

/**
 * The single most important performance decision in the bot.
 *
 * ~95% of incoming updates are ordinary group chatter the bot must ignore.
 * Only ~5% (commands, callbacks, inline, payments, …) need real work. This
 * predicate runs *before* session, i18n and any DB access, so the expensive
 * machinery is only paid for the updates that actually matter.
 *
 * Rule of thumb, keyed on chat type:
 *   • Private chat       → always relevant (low volume; almost anything can be
 *                          a quote request, a media-to-quote, a payment, etc.)
 *   • Non-message update → relevant (callback / inline / payment / member /
 *                          business events are never "noise")
 *   • Group/supergroup   → relevant ONLY if it is a command, a reply to the
 *                          bot, or an @mention of the bot.
 *
 * Everything else (plain group text/media/stickers) is noise: we count it and
 * return without touching the database.
 */
export function isRelevantUpdate(ctx: BotContext): boolean {
  // A guest_message is a Bot API guest-mode query: the bot was invoked in a
  // chat it isn't a member of, and is expected to answer with answerGuestQuery.
  // Always directed at us → always relevant.
  if (ctx.guestMessage) return true

  // Non-message updates are always worth handling — they're inherently directed
  // at the bot (someone tapped a button, queried inline, paid, joined, …).
  if (
    ctx.callbackQuery ||
    ctx.inlineQuery ||
    ctx.chosenInlineResult ||
    ctx.preCheckoutQuery ||
    ctx.shippingQuery ||
    ctx.myChatMember ||
    ctx.chatMember ||
    ctx.chatJoinRequest ||
    ctx.businessConnection ||
    ctx.businessMessage
  ) {
    return true
  }

  const msg = ctx.message ?? ctx.editedMessage
  if (!msg) {
    // Channel posts, reactions, polls we don't care about, etc.
    return false
  }

  // Private chat: low volume, treat everything as relevant.
  if (ctx.chat?.type === 'private') return true

  // From here on: a message in a group/supergroup. Relevant only if it targets
  // the bot in one of three ways.

  // 1) A command (entity at offset 0). Covers "/q" and "/q@thisbot".
  const isCommand = msg.entities?.some(
    (e) => e.type === 'bot_command' && e.offset === 0,
  )
  if (isCommand) return true

  // 2) A reply to one of the bot's own messages.
  if (msg.reply_to_message?.from?.id === ctx.me.id) return true

  // 3) An @mention of the bot anywhere in the text/caption. Telegram marks
  // mention entities case-insensitively ("@quotlybot" mentions "QuotLyBot"),
  // so the comparison must be too — same as bareMentionArgs downstream.
  const text = msg.text ?? msg.caption
  if (text && msg.entities) {
    const lowerName = ctx.me.username?.toLowerCase()
    const mentionsBot = msg.entities.some((e) => {
      if (e.type === 'mention') {
        return text.slice(e.offset + 1, e.offset + e.length).toLowerCase() === lowerName
      }
      if (e.type === 'text_mention') {
        return e.user?.id === ctx.me.id
      }
      return false
    })
    if (mentionsBot) return true
  }

  return false
}

/**
 * Middleware wrapper around {@link isRelevantUpdate}. Drops noise cheaply and
 * records the relevance split in Prometheus.
 *
 * The noise branch is also where the auto-gab heuristic lives: every human
 * group message feeds the in-memory activity tracker (O(1)), and a tiny
 * fraction of otherwise-dropped messages are promoted to an auto-quote trigger
 * when the chat is lively. Both are memory-only — no DB on the hot path.
 */
export async function fastPath(ctx: BotContext, next: NextFunction): Promise<void> {
  const msg = ctx.message ?? ctx.editedMessage
  const inGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'
  if (msg && inGroup && ctx.chat && ctx.from && !ctx.from.is_bot) {
    recordActivity(ctx.chat.id, ctx.from.id)
  }

  if (isRelevantUpdate(ctx)) {
    updatesTotal.inc({ relevant: 'true' })
    return next()
  }

  // Group noise — but occasionally a lively moment worth an auto-quote.
  if (msg && inGroup && ctx.chat && considerGab(ctx.chat.id)) {
    ctx.gabTrigger = true
    updatesTotal.inc({ relevant: 'gab' })
    return next()
  }

  updatesTotal.inc({ relevant: 'false' })
}

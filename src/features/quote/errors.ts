import { GrammyError } from 'grammy'
import type { BotContext } from '../../core/types'
import { QuoteApiError, QuoteApiUnavailableError } from '../../services/quote-api/client'

/** Replies with an HTML message, threading the reply to the trigger when possible. */
export async function replyHtml(
  ctx: BotContext,
  text: string,
  replyToMessageId?: number,
): Promise<void> {
  // In guest mode the bot can't post into the foreign chat; surface the text as
  // an inline answer article instead.
  if (ctx.guestMessage) {
    await ctx
      .answerGuestQuery({
        type: 'article',
        id: 'err',
        title: 'Quotly',
        input_message_content: { message_text: text, parse_mode: 'HTML' },
      })
      .catch(() => {})
    return
  }

  await ctx
    .reply(text, {
      parse_mode: 'HTML',
      ...(replyToMessageId
        ? { reply_parameters: { message_id: replyToMessageId, allow_sending_without_reply: true } }
        : {}),
    })
    .catch(() => {})
}

/**
 * Maps a generation/send failure to a localized, user-friendly message.
 * Ported from the legacy `handleQuoteError`, but type-driven: we branch on the
 * concrete error class (GrammyError / QuoteApiError) instead of duck-typing
 * `error.description`.
 */
export async function handleQuoteError(
  ctx: BotContext,
  err: unknown,
  replyToMessageId?: number,
): Promise<void> {
  const reply = (key: string, vars?: Record<string, string | number>): Promise<void> =>
    replyHtml(ctx, ctx.t(key, vars), replyToMessageId)

  // Expected backpressure / permission states are logged at debug (a user-facing
  // message is still sent); only genuine faults warrant a warn with the stack.
  const isBackpressure = err instanceof QuoteApiError && err.status === 429
  const isBenignTg =
    err instanceof GrammyError &&
    (err.error_code === 403 ||
      err.error_code === 429 ||
      /not enough rights|chat write forbidden|forbidden|blocked|deactivated/i.test(err.description))
  ctx.logger[isBackpressure || isBenignTg ? 'debug' : 'warn']({ err }, 'quote generation failed')

  if (err instanceof GrammyError) {
    const d = err.description.toLowerCase()
    if (err.error_code === 429) return reply('quote-errors-rate_limit', { seconds: 30 })
    if (d.includes('not enough rights to send documents')) return reply('quote-errors-no_rights_send_documents')
    if (d.includes('not enough rights to send stickers')) return reply('quote-errors-no_rights_send_stickers')
    if (d.includes('not enough rights to send photos')) return reply('quote-errors-no_rights_send_photos')
    if (d.includes('chat write forbidden') || d.includes('forbidden')) return reply('quote-errors-chat_write_forbidden')
    if (d.includes('bot was blocked by the user')) return reply('quote-errors-bot_blocked')
    if (d.includes('user is deactivated')) return reply('quote-errors-user_deactivated')
    if (d.includes('stickerset_invalid')) return reply('quote-errors-sticker_set_invalid')
    if (d.includes('sticker set full') || d.includes('too many stickers')) return reply('quote-errors-sticker_set_full')
    if (d.includes('request entity too large') || d.includes('file too big')) return reply('quote-errors-file_too_large')
    if (d.includes('message is too long')) return reply('quote-errors-message_too_long')
    if (d.includes('timeout') || d.includes('timed out')) return reply('quote-errors-timeout_error')
    return reply('quote-errors-telegram_error', { error: err.description })
  }

  if (err instanceof QuoteApiError) {
    const m = err.message.toLowerCase()
    if (err.status === 429) return reply('quote-errors-rate_limit', { seconds: 30 })
    if (m.includes('file too large')) return reply('quote-errors-file_too_large')
    if (m.includes('unsupported format')) return reply('quote-errors-invalid_format')
    return reply('quote-api_error', { error: err.message })
  }

  if (err instanceof QuoteApiUnavailableError) return reply('quote-errors-api_down')

  return reply('quote-errors-api_down')
}

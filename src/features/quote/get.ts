import { Composer } from 'grammy'
import { Types } from 'mongoose'
import type { BotContext } from '../../core/types'
import { Quote, type QuoteDoc } from '../../db/models'
import { deepLink } from '../../helpers/deep-link'
import { buildRatingKeyboard } from './reply-markup'

/** `/q_<id>` — resends a stored quote by its Mongo id with fresh rating buttons. */
export function registerGetQuote(composer: Composer<BotContext>): void {
  composer.hears(/^\/q_(\S+)/, async (ctx) => {
    const raw = ctx.match[1]?.split('@')[0]
    if (!raw || !Types.ObjectId.isValid(raw)) return

    const quote = await Quote.findById(raw).lean<QuoteDoc>().catch(() => null)
    if (!quote?.file_id) return

    const deepLinkRow =
      quote.local_id != null && quote.group && ctx.me?.username
        ? {
            url: deepLink.forQuote(ctx.me.username, quote.group.toString(), quote.local_id),
            label: ctx.t('app-open_quote'),
          }
        : undefined
    const kb = buildRatingKeyboard(quote, deepLinkRow)

    // Stored quotes are always stickers (persist runs only for the sticker
    // render path), so resend as a sticker — that's what the `rate:` handler
    // looks up by `message.sticker.file_unique_id`.
    const messageId = ctx.message?.message_id
    await ctx.replyWithSticker(quote.file_id, {
      reply_markup: kb,
      ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}),
    })
  })
}

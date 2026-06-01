import { Composer, InlineKeyboard } from 'grammy'
import type { InlineQueryResult } from 'grammy/types'
import { Types } from 'mongoose'
import type { BotContext } from '../../core/types'
import { Quote, type QuoteDoc } from '../../db/models'

const LIMIT = 50

function ratingKeyboard(quote: QuoteDoc): InlineKeyboard {
  const up = quote.rate?.votes?.[0]?.vote?.length ?? 0
  const down = quote.rate?.votes?.[1]?.vote?.length ?? 0
  return new InlineKeyboard()
    .text(`👍 ${up || ''}`.trim(), `irate:${quote._id.toString()}:👍`)
    .text(`👎 ${down || ''}`.trim(), `irate:${quote._id.toString()}:👎`)
}

function toStickerResult(quote: QuoteDoc): InlineQueryResult | null {
  if (!quote.file_id) return null
  return {
    type: 'sticker',
    id: quote._id.toString(),
    sticker_file_id: quote.file_id,
    reply_markup: ratingKeyboard(quote),
  }
}

export const inlineFeature = new Composer<BotContext>()

/**
 * Inline mode: `@bot top:<groupId>` lists a group's top quotes; an empty query
 * lists the quotes the caller has up-voted. Paginated via the numeric offset.
 */
inlineFeature.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query
  const offset = parseInt(ctx.inlineQuery.offset, 10) || 0

  const topMatch = query.match(/^top:(.+)$/)
  if (topMatch && Types.ObjectId.isValid(topMatch[1]!)) {
    const quotes = await Quote.find({ group: new Types.ObjectId(topMatch[1]!), 'rate.score': { $gt: 0 } })
      .sort({ 'rate.score': -1 })
      .skip(offset)
      .limit(LIMIT)
      .lean<QuoteDoc[]>()
      .catch(() => [])

    const results = quotes.map(toStickerResult).filter((r): r is InlineQueryResult => r !== null)
    await ctx
      .answerInlineQuery(results, { is_personal: false, cache_time: 300, next_offset: String(offset + LIMIT) })
      .catch(() => {})
    return
  }

  // Default: the caller's up-voted quotes.
  if (!ctx.user) {
    await ctx.answerInlineQuery([], { cache_time: 5 }).catch(() => {})
    return
  }

  const liked = await Quote.find({ 'rate.votes.0.vote': ctx.user._id })
    .sort({ 'rate.score': -1 })
    .skip(offset)
    .limit(LIMIT)
    .lean<QuoteDoc[]>()
    .catch(() => [])

  const results = liked.map(toStickerResult).filter((r): r is InlineQueryResult => r !== null)
  await ctx
    .answerInlineQuery(results, { is_personal: true, cache_time: 5, next_offset: String(offset + LIMIT) })
    .catch(() => {})
})

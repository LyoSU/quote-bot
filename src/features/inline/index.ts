import { Composer, InlineKeyboard } from 'grammy'
import type { InlineQueryResult, InlineQueryResultsButton } from 'grammy/types'
import { Types } from 'mongoose'
import { config } from '../../config/env'
import type { BotContext } from '../../core/types'
import { Quote, type QuoteDoc } from '../../db/models'
import { inlineWordFilter, parseInlineSearch } from './search'

const LIMIT = 50
const QUERY_BUDGET_MS = 1_500
const RESULT_FIELDS = { file_id: 1, rate: 1 } as const

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

/**
 * Next page offset, or '' to end pagination. Based on the RAW document count
 * (before the null-file_id filter): a full raw page may still hide more.
 */
export function nextOffset(offset: number, rawCount: number): string {
  return rawCount < LIMIT ? '' : String(offset + LIMIT)
}

/**
 * "Open archive" button pinned above inline results. `web_app` needs a direct
 * https URL (not the t.me link), so it only exists when MINI_APP_URL is set.
 */
export function appResultsButton(ctx: BotContext): { button?: InlineQueryResultsButton } {
  const url = config.MINI_APP_URL
  if (!url || !url.startsWith('https://')) return {}
  return { button: { text: ctx.t('app-inline_open'), web_app: { url } } }
}

export const inlineFeature = new Composer<BotContext>()

/**
 * Inline mode: `@bot top:<groupId>` lists a group's top quotes; an empty query
 * lists the quotes the caller has up-voted. `find:<groupId>` lists all group
 * stickers. Words filter each list by archived text or author, keeping the
 * score ordering. Paginated via the numeric offset.
 */
inlineFeature.on('inline_query', async (ctx) => {
  const query = parseInlineSearch(ctx.inlineQuery.query)
  const parsedOffset = Number(ctx.inlineQuery.offset)
  const offset = Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0
  const wordFilter = inlineWordFilter(query.text)

  if (query.groupId) {
    const quotes = await Quote.find({
      group: new Types.ObjectId(query.groupId),
      ...(query.scope === 'top' ? { 'rate.score': { $gt: 0 } } : { file_id: { $type: 'string', $ne: '' } }),
      ...wordFilter,
    })
      .select(RESULT_FIELDS)
      .sort({ 'rate.score': -1 })
      .skip(offset)
      .limit(LIMIT)
      .maxTimeMS(QUERY_BUDGET_MS)
      .lean<QuoteDoc[]>()
      .catch(() => [])

    const results = quotes.map(toStickerResult).filter((r): r is InlineQueryResult => r !== null)
    await ctx
      .answerInlineQuery(results, { is_personal: false, cache_time: query.scope === 'top' && !query.text ? 300 : 5, next_offset: nextOffset(offset, quotes.length), ...appResultsButton(ctx) })
      .catch(() => {})
    return
  }

  // Default: the caller's up-voted quotes.
  if (!ctx.user) {
    await ctx.answerInlineQuery([], { cache_time: 5, ...appResultsButton(ctx) }).catch(() => {})
    return
  }

  const liked = await Quote.find({
    // The broad vote predicate uses the existing { rate.votes.vote, rate.score }
    // index; the numeric-path predicate restricts the result to up-votes.
    'rate.votes.vote': ctx.user._id,
    'rate.votes.0.vote': ctx.user._id,
    ...wordFilter,
  })
    .select(RESULT_FIELDS)
    .sort({ 'rate.score': -1 })
    .skip(offset)
    .limit(LIMIT)
    .maxTimeMS(QUERY_BUDGET_MS)
    .lean<QuoteDoc[]>()
    .catch(() => [])

  const results = liked.map(toStickerResult).filter((r): r is InlineQueryResult => r !== null)
  await ctx
    .answerInlineQuery(results, { is_personal: true, cache_time: 5, next_offset: nextOffset(offset, liked.length), ...appResultsButton(ctx) })
    .catch(() => {})
})

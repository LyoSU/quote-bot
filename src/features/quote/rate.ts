import { Composer, InlineKeyboard } from 'grammy'
import { Types } from 'mongoose'
import type { BotContext } from '../../core/types'
import { Quote, type QuoteDoc } from '../../db/models'

// Vote entries are usually ObjectIds, but legacy data also holds raw string
// ids — compare/store defensively rather than assuming ObjectId methods exist.
type Vote = { name: string; vote: (Types.ObjectId | string)[] }

export function ensureVotes(quote: Pick<QuoteDoc, 'rate'>): Vote[] {
  const votes = quote.rate?.votes as Vote[] | undefined
  if (votes && votes.length >= 2) return votes
  return [
    { name: '👍', vote: [] },
    { name: '👎', vote: [] },
  ]
}

/**
 * Toggles `userId`'s vote on `rateName` (mutating `votes` in place) and returns
 * what happened. Comparison is string-based so it works whether stored votes
 * are ObjectIds (new) or raw strings (legacy). Pure → unit-tested.
 */
export function applyVote(
  votes: Vote[],
  userId: Types.ObjectId | string,
  rateName: string,
): 'rated' | 'back' | null {
  const userIdStr = userId.toString()
  let result: 'rated' | 'back' | null = null
  for (const rate of votes) {
    const idx = rate.vote.findIndex((v) => String(v) === userIdStr)
    if (idx > -1) rate.vote.splice(idx, 1)
    if (rate.name === rateName) {
      if (idx > -1) {
        result = 'back'
      } else {
        result = 'rated'
        rate.vote.push(userId)
      }
    }
  }
  return result
}

/**
 * Toggles the caller's vote on a quote. Ported from the legacy handler but
 * written as a read + atomic `$set` (votes + recomputed score) instead of a
 * full-document `save()`, sidestepping Mongoose VersionErrors under concurrent
 * votes on the same quote.
 */
async function handleRate(ctx: BotContext, kind: 'rate' | 'irate'): Promise<void> {
  const userId = ctx.user?._id
  if (!userId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  let quote: QuoteDoc | null
  let rateName: string

  if (kind === 'irate') {
    const id = ctx.match?.[1]
    rateName = ctx.match?.[2] ?? ''
    if (!id || !Types.ObjectId.isValid(id)) return
    quote = await Quote.findById(id).lean<QuoteDoc>().catch(() => null)
  } else {
    rateName = ctx.match?.[1] ?? ''
    const msg = ctx.callbackQuery?.message
    const uniqueId = msg?.sticker?.file_unique_id ?? msg?.document?.file_unique_id
    if (!uniqueId) return
    quote = await Quote.findOne({ file_unique_id: uniqueId }).lean<QuoteDoc>().catch(() => null)
  }

  if (!quote) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  const votes = ensureVotes(quote)
  const outcome = applyVote(votes, userId, rateName)
  const resultText =
    outcome === 'back' ? ctx.t('rate-vote-back') : outcome === 'rated' ? ctx.t('rate-vote-rated', { rateName }) : ''

  const score = votes[0]!.vote.length - votes[1]!.vote.length
  await Quote.updateOne({ _id: quote._id }, { $set: { 'rate.votes': votes, 'rate.score': score } }).catch(() => {})

  await ctx.answerCallbackQuery(resultText ? { text: resultText } : undefined).catch(() => {})

  const up = votes[0]!.vote.length
  const down = votes[1]!.vote.length

  const kb = new InlineKeyboard()
  if (kind === 'irate') {
    kb.text(`👍 ${up || ''}`.trim(), `irate:${quote._id.toString()}:👍`).text(
      `👎 ${down || ''}`.trim(),
      `irate:${quote._id.toString()}:👎`,
    )
  } else {
    kb.text(`👍 ${up || ''}`.trim(), 'rate:👍').text(`👎 ${down || ''}`.trim(), 'rate:👎')
    // Preserve a trailing url button (e.g. "Open in app") if present.
    const rows = ctx.callbackQuery?.message?.reply_markup?.inline_keyboard ?? []
    const lastRow = rows[rows.length - 1]
    const urlButton = lastRow?.find((b): b is { text: string; url: string } => 'url' in b)
    if (urlButton) kb.row().url(urlButton.text, urlButton.url)
  }

  await ctx.editMessageReplyMarkup({ reply_markup: kb }).catch(() => {})
}

export function registerRate(composer: Composer<BotContext>): void {
  composer.callbackQuery(/^rate:(👍|👎)$/, (ctx) => handleRate(ctx, 'rate'))
  composer.callbackQuery(/^irate:([^:]+):(👍|👎)$/, (ctx) => handleRate(ctx, 'irate'))
}

import { Composer, InlineKeyboard } from 'grammy'
import { Types, type PipelineStage } from 'mongoose'
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
 * Builds an aggregation-pipeline update that toggles `userId`'s vote on
 * `rateName` entirely server-side. The previous read-then-`$set` path lost one
 * of two simultaneous votes — each writer re-`$set` the whole array from its
 * own stale read, so the second write erased the first. Deriving the new arrays
 * from the live `$rate.votes` inside the update makes concurrent votes on the
 * same quote compose instead of clobber.
 *
 * Semantics are identical to {@link applyVote}: the caller is pulled from both
 * buckets, then re-added to the tapped bucket only if they weren't already in
 * it (tap same → retract, tap other → move). Vote elements are `$toString`-
 * compared so it works whether ids were stored as ObjectIds (new) or raw
 * strings (legacy), and the array is rebuilt as exactly the two 👍/👎 buckets
 * in fixed order so missing/short legacy `rate.votes` are repaired in place
 * (matching {@link ensureVotes}). `$ifNull` guards keep the path valid when
 * `rate.votes` is absent.
 */
export function buildVoteUpdate(userId: Types.ObjectId | string, rateName: string): PipelineStage[] {
  const userIdStr = userId.toString()
  const votedUp = rateName === '👍'

  // `$rate.votes.vote` projects the buckets to `[[…👍 ids…], […👎 ids…]]`.
  const buckets = { $ifNull: ['$rate.votes.vote', []] }
  const bucketAt = (i: number): Record<string, unknown> => ({ $ifNull: [{ $arrayElemAt: [buckets, i] }, []] })
  const withoutUser = (arr: unknown): Record<string, unknown> => ({
    $filter: { input: arr, as: 'v', cond: { $ne: [{ $toString: '$$v' }, userIdStr] } },
  })
  const hasUser = (arr: unknown): Record<string, unknown> => ({
    $in: [userIdStr, { $map: { input: arr, as: 'v', in: { $toString: '$$v' } } }],
  })

  const up = bucketAt(0)
  const down = bucketAt(1)
  // Re-add the caller to the tapped bucket only when they weren't already in it.
  const newUp = {
    $concatArrays: [withoutUser(up), { $cond: [{ $and: [votedUp, { $not: [hasUser(up)] }] }, [userId], []] }],
  }
  const newDown = {
    $concatArrays: [withoutUser(down), { $cond: [{ $and: [!votedUp, { $not: [hasUser(down)] }] }, [userId], []] }],
  }

  return [
    {
      $set: {
        'rate.votes': [
          { name: '👍', vote: newUp },
          { name: '👎', vote: newDown },
        ],
        'rate.score': { $subtract: [{ $size: newUp }, { $size: newDown }] },
      },
    },
  ] as PipelineStage[]
}

/**
 * Toggles the caller's vote on a quote. Ported from the legacy handler but the
 * write is a single atomic aggregation-pipeline update ({@link buildVoteUpdate})
 * instead of a full-document `save()`/read-modify-`$set`, sidestepping Mongoose
 * VersionErrors and the lost-update race under concurrent votes on one quote.
 * The pre-read only decides the toast text + supplies fallback counts; the
 * post-update doc is authoritative for the keyboard.
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

  // The pre-read only drives the toast text (best-effort — the atomic write
  // below is what actually decides the stored state) and supplies fallback
  // counts if the write can't hand back a fresh doc.
  const votes = ensureVotes(quote)
  const outcome = applyVote(votes, userId, rateName)
  const resultText =
    outcome === 'back' ? ctx.t('rate-vote-back') : outcome === 'rated' ? ctx.t('rate-vote-rated', { rateName }) : ''

  const updated = await Quote.findOneAndUpdate({ _id: quote._id }, buildVoteUpdate(userId, rateName), { new: true })
    .lean<QuoteDoc>()
    .catch(() => null)
  const persisted = updated ? ensureVotes(updated) : votes

  await ctx.answerCallbackQuery(resultText ? { text: resultText } : undefined).catch(() => {})

  const up = persisted[0]!.vote.length
  const down = persisted[1]!.vote.length

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

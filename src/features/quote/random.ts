import { Composer, InlineKeyboard } from 'grammy'
import { Types } from 'mongoose'
import type { BotContext } from '../../core/types'
import { Group, Quote } from '../../db/models'
import { deepLink } from '../../helpers/deep-link'
import { onlyGroup } from '../../middlewares/guards'
import { activeSpeakers, rememberFired } from '../../services/gab'

interface SampledQuote {
  _id: Types.ObjectId
  file_id?: string
  local_id?: number
  rate?: { votes?: { vote?: unknown[] }[] }
}

/** Samples one highly-rated quote, optionally biased to a present author. */
async function sampleQuote(groupId: Types.ObjectId, preferAuthors: number[]): Promise<SampledQuote | undefined> {
  if (preferAuthors.length > 0) {
    const [byPresent] = (await Quote.aggregate([
      // `authors.0 exists` lets the planner use the partial
      // { 'authors.telegram_id': 1, group: 1 } index.
      { $match: { group: groupId, 'authors.0': { $exists: true }, 'authors.telegram_id': { $in: preferAuthors }, 'rate.score': { $gt: 0 } } },
      { $sample: { size: 1 } },
    ])) as SampledQuote[]
    if (byPresent) return byPresent
  }
  const [any] = (await Quote.aggregate([
    { $match: { group: groupId, 'rate.score': { $gt: 0 } } },
    { $sample: { size: 1 } },
  ])) as SampledQuote[]
  return any
}

function ratingKeyboard(ctx: BotContext, quote: SampledQuote): InlineKeyboard {
  const up = quote.rate?.votes?.[0]?.vote?.length ?? 0
  const down = quote.rate?.votes?.[1]?.vote?.length ?? 0
  const kb = new InlineKeyboard().text(`👍 ${up || ''}`.trim(), 'rate:👍').text(`👎 ${down || ''}`.trim(), 'rate:👎')
  if (quote.local_id != null && ctx.group && ctx.me?.username) {
    kb.row().url(ctx.t('app-open_quote'), deepLink.forQuote(ctx.me.username, ctx.group._id.toString(), quote.local_id))
  }
  return kb
}

/**
 * Sends a random highly-rated quote. When `silentIfEmpty` (the auto-gab path)
 * it stays quiet on an empty group; the explicit `/qrand` command nudges the
 * user instead.
 */
async function sendRandomQuote(
  ctx: BotContext,
  opts: { preferAuthors?: number[]; silentIfEmpty?: boolean } = {},
): Promise<boolean> {
  if (!ctx.group) return false

  const quote = await sampleQuote(ctx.group._id, opts.preferAuthors ?? []).catch(() => undefined)
  const messageId = ctx.message?.message_id
  const replyParams = messageId
    ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true as const } }
    : {}

  if (!quote?.file_id) {
    if (!opts.silentIfEmpty) {
      await ctx.reply(ctx.t('random-empty'), { parse_mode: 'HTML', ...replyParams }).catch(() => {})
    }
    return false
  }

  await ctx
    .replyWithSticker(quote.file_id, { reply_markup: ratingKeyboard(ctx, quote), ...replyParams })
    .catch(() => {})
  return true
}

export function registerRandom(composer: Composer<BotContext>): void {
  // /qrand — explicit pull of a random highly-rated quote.
  composer.hears(/^\/qrand\b/i, onlyGroup, (ctx) => sendRandomQuote(ctx).then(() => undefined))

  // Auto-gab: fires only when the fast-path flagged a lively moment. The trick —
  // we bias the pick to a quote authored by someone currently in the chat, so
  // it lands as a "remember when they said this?" throwback rather than noise.
  composer.use(async (ctx, next) => {
    if (!ctx.gabTrigger || !ctx.group || !ctx.chat) return next()

    const present = activeSpeakers(ctx.chat.id)
    const fired = await sendRandomQuote(ctx, { preferAuthors: present, silentIfEmpty: true })
    if (fired) {
      rememberFired(ctx.chat.id)
      void Group.updateOne({ _id: ctx.group._id }, { $set: { lastRandomQuote: new Date() } }).catch(() => {})
    }
    // Auto-gab consumes the update — it was group noise to everyone else.
  })
}

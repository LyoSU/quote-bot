import { Composer, type InlineKeyboard } from 'grammy'
import { Types } from 'mongoose'
import type { BotContext } from '../../core/types'
import { Group, Quote } from '../../db/models'
import { deepLink } from '../../helpers/deep-link'
import { onlyGroup } from '../../middlewares/guards'
import { activeSpeakers, rememberFired } from '../../services/gab'
import { resolveQuoteLink } from './app-link'
import { checkQuoteRate } from './rate-limit'
import { buildRatingKeyboard } from './reply-markup'

export interface SampledQuote {
  _id: Types.ObjectId
  file_id?: string
  local_id?: number
  rate?: { score?: number; votes?: { vote?: unknown[] }[] }
}

/** Chance of biasing toward a "throwback" (quote authored by someone present). */
const THROWBACK_CHANCE = 0.5

/** Samples one highly-rated quote, optionally biased to a present author. */
export async function sampleQuote(
  groupId: Types.ObjectId,
  preferAuthors: number[],
  rng: () => number = Math.random,
): Promise<SampledQuote | undefined> {
  // Active speakers are usually quoted a lot, so this branch wins on nearly
  // every gab fire — only try it part of the time, otherwise auto-gab ends up
  // sampling a much narrower pool (only quotes with saved author metadata)
  // than /qrand, which always samples the full pool below.
  if (preferAuthors.length > 0 && rng() < THROWBACK_CHANCE) {
    const [byPresent] = (await Quote.aggregate([
      // `authors.0 exists` lets the planner use the partial
      // { 'authors.telegram_id': 1, group: 1 } index.
      { $match: { group: groupId, 'authors.0': { $exists: true }, 'authors.telegram_id': { $in: preferAuthors }, 'rate.score': { $gt: 0 } } },
      { $sample: { size: 1 } },
    ])) as SampledQuote[]
    if (byPresent) return byPresent
  }
  return pickUniform({ group: groupId, 'rate.score': { $gt: 0 } }, rng)
}

/**
 * One rated quote of a group, each with the same 1/n chance, reading one document.
 *
 * `$match` + `$sample` looked like one indexed read, but a `$sample` that is not the
 * first stage random-sorts every matched document: a group with 7.7k rated quotes
 * pulled all 7.7k off disk for each pick (7.5 s on prod, ~24 picks a minute across
 * groups — the top disk reader of the shared Mongo, 10.10). Here both steps walk the
 * { group, rate.score } index: the count is a COUNT_SCAN and the skip runs below the
 * FETCH, so the one document read is the one returned. The index order is total
 * (ties fall back to the record id), so every k names exactly one quote.
 *
 * A quote unrated or forgotten between the count and the pick can leave k past the
 * end; the pool is counted again rather than settling for a neighbour.
 */
async function pickUniform(
  filter: { group: Types.ObjectId; 'rate.score': { $gt: number } },
  rng: () => number,
): Promise<SampledQuote | undefined> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const n = await Quote.countDocuments(filter)
    if (n === 0) return undefined
    const [quote] = await Quote.find(filter)
      .sort({ 'rate.score': -1 })
      .skip(Math.floor(rng() * n))
      .limit(1)
      .lean<SampledQuote[]>()
    if (quote) return quote
  }
  return undefined
}

/** Roughly 1 in 5 explicit /qrand picks swaps the quote link for the author game. */
export const GAME_OFFER_CHANCE = 0.2

export function shouldOfferGame(rng: () => number = Math.random): boolean {
  return rng() < GAME_OFFER_CHANCE
}

/**
 * Rating keyboard for a random pick. The app button follows `settings.appButton`
 * (quote link, or — when `offerGame` wins the dice roll — the author game).
 */
export async function buildRandomKeyboard(
  ctx: BotContext,
  quote: SampledQuote,
  opts: { offerGame?: boolean; rng?: () => number } = {},
): Promise<InlineKeyboard> {
  if (opts.offerGame && ctx.group && ctx.me?.username && (ctx.group.settings?.appButton ?? true) && shouldOfferGame(opts.rng)) {
    return buildRatingKeyboard(quote, {
      url: deepLink.forGame(ctx.me.username, ctx.group._id.toString()),
      label: ctx.t('app-open_game'),
    })
  }
  const link = await resolveQuoteLink(ctx, { ...quote, group: ctx.group?._id })
  return buildRatingKeyboard(quote, link)
}

/**
 * Sends a random highly-rated quote. When `silentIfEmpty` (the auto-gab path)
 * it stays quiet on an empty group; the explicit `/qrand` command nudges the
 * user instead.
 */
async function sendRandomQuote(
  ctx: BotContext,
  opts: { preferAuthors?: number[]; silentIfEmpty?: boolean; offerGame?: boolean; rng?: () => number } = {},
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

  const reply_markup = await buildRandomKeyboard(ctx, quote, { offerGame: opts.offerGame, rng: opts.rng })
  await ctx.replyWithSticker(quote.file_id, { reply_markup, ...replyParams }).catch(() => {})
  return true
}

export function registerRandom(composer: Composer<BotContext>): void {
  // /qrand — explicit pull of a random highly-rated quote. Shares the /q
  // flood budget: the $sample and the send cost the same either way.
  composer.hears(/^\/qrand\b/i, onlyGroup, async (ctx) => {
    const rate = checkQuoteRate(ctx.from?.id, ctx.chat?.id ?? 0)
    if (!rate.ok) {
      if (rate.notify)
        await ctx.reply(ctx.t('quote-errors-rate_limit', { seconds: rate.retryAfterSeconds })).catch(() => {})
      return
    }
    await sendRandomQuote(ctx, { offerGame: true })
  })

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

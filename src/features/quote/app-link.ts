import type { Types } from 'mongoose'
import type { BotContext } from '../../core/types'
import { Quote } from '../../db/models'
import { deepLink } from '../../helpers/deep-link'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export interface AppLink {
  url: string
  label: string
}

/** The fields of a stored quote needed to build its app link. */
export interface LinkableQuote {
  _id?: Types.ObjectId
  group?: Types.ObjectId | null
  local_id?: number | null
  rate?: { score?: number | null } | null
}

/** `№12 ↗`, or the localized "#1 of the week" badge. */
export function quoteLinkLabel(t: (key: string) => string, localId: number, weeklyTop: boolean): string {
  return weeklyTop ? t('app-open_top_week') : `№${localId} ↗`
}

/**
 * Whether the quote is currently #1 by score among its group's quotes from the
 * last 7 days. One query on { group, createdAt }; skipped for unrated quotes.
 */
export async function isWeeklyTop(quote: LinkableQuote, now: number = Date.now()): Promise<boolean> {
  if (!quote._id || !quote.group || !((quote.rate?.score ?? 0) > 0)) return false
  const top = await Quote.findOne({ group: quote.group, createdAt: { $gte: new Date(now - WEEK_MS) } })
    .sort({ 'rate.score': -1, createdAt: -1 })
    .select({ _id: 1 })
    .lean<{ _id: Types.ObjectId }>()
    .catch(() => null)
  return Boolean(top && top._id.toString() === quote._id.toString())
}

/**
 * The "open in app" button for a stored quote, or undefined when it must not be
 * shown (group disabled it, no local id, no bot username).
 */
export async function resolveQuoteLink(ctx: BotContext, quote: LinkableQuote): Promise<AppLink | undefined> {
  if (quote.local_id == null || !quote.group || !ctx.me?.username) return undefined
  if (!(ctx.group?.settings?.appButton ?? true)) return undefined
  const weeklyTop = await isWeeklyTop(quote)
  return {
    url: deepLink.forQuote(ctx.me.username, quote.group.toString(), quote.local_id),
    label: quoteLinkLabel((k) => ctx.t(k), quote.local_id, weeklyTop),
  }
}

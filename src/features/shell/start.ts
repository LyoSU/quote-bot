import { InlineKeyboard } from 'grammy'
import type { Types } from 'mongoose'
import { Group, GroupMember, Quote } from '../../db/models'
import { deepLink } from '../../helpers/deep-link'

type T = (key: string) => string

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
/** Upper bound of groups looked at per user — keeps the aggregate small. */
const MAX_GROUPS = 50

export interface WeeklyCount {
  group: string
  count: number
}

export interface BestGroup {
  id: string
  title: string
  count: number
}

/**
 * The group with the most quotes this week. `titles` maps group id -> title;
 * groups without a title are skipped (the line needs a name), ties go to the
 * earlier entry.
 */
export function pickBestGroup(counts: readonly WeeklyCount[], titles: ReadonlyMap<string, string | undefined>): BestGroup | null {
  let best: BestGroup | null = null
  for (const { group, count } of counts) {
    const title = titles.get(group)?.trim()
    if (!title || count <= 0) continue
    if (!best || count > best.count) best = { id: group, title, count }
  }
  return best
}

export type StartState = { kind: 'new' } | { kind: 'returning'; best: BestGroup | null }

/** New vs returning user, plus their busiest group this week. Indexed + bounded: 3 small queries. */
export async function loadStartState(telegramId: number, now: number = Date.now()): Promise<StartState> {
  const members = await GroupMember.find({ telegram_id: telegramId })
    .select({ group: 1 })
    .limit(MAX_GROUPS)
    .lean<{ group: Types.ObjectId }[]>()
  if (members.length === 0) return { kind: 'new' }

  const ids = members.map((m) => m.group)
  const rows = await Quote.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { group: { $in: ids }, createdAt: { $gte: new Date(now - WEEK_MS) } } },
    { $group: { _id: '$group', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 5 },
  ])
  if (rows.length === 0) return { kind: 'returning', best: null }

  const groups = await Group.find({ _id: { $in: rows.map((r) => r._id) } })
    .select({ title: 1 })
    .lean<{ _id: Types.ObjectId; title?: string }[]>()
  const titles = new Map(groups.map((g) => [g._id.toString(), g.title]))
  const best = pickBestGroup(
    rows.map((r) => ({ group: r._id.toString(), count: r.n })),
    titles,
  )
  return { kind: 'returning', best }
}

const addGroupUrl = (username: string): string => `https://t.me/${username}?startgroup=add`

/** New user: add to a group, set up a personal style, or learn how it works. */
export function newUserKeyboard(t: T, username: string): InlineKeyboard {
  return new InlineKeyboard()
    .url(t('menu-btn-add_group'), addGroupUrl(username))
    .row()
    .url(t('start-btn-style'), deepLink.forSettings(username))
    .text(t('start-btn-how'), 'menu:guide')
}

/** Returning user: open their quotes first. */
export function returningKeyboard(t: T, username: string, best: BestGroup | null): InlineKeyboard {
  const open = best ? deepLink.forGroup(username, best.id) : deepLink.forRoot(username)
  return new InlineKeyboard()
    .url(t('start-btn-open'), open)
    .row()
    .url(t('start-btn-add_more'), addGroupUrl(username))
    .row()
    .url(t('start-btn-style'), deepLink.forSettings(username))
    .text(t('start-btn-help'), 'menu:guide')
}

/** The "help" panel: everything the old main menu held. */
export function guideKeyboard(t: T): InlineKeyboard {
  return new InlineKeyboard()
    .text(t('menu-btn-features'), 'menu:features')
    .text(t('menu-btn-settings'), 'qs:open')
    .row()
    .text(t('menu-btn-help'), 'menu:help')
    .text(t('menu-btn-language'), 'menu:language')
    .row()
    .text(t('menu-btn-back'), 'menu:main')
}

/** Group /start: a single style button, unless the group hid app links. */
export function groupStartKeyboard(t: T, username: string, groupId: string, appButton: boolean | undefined): InlineKeyboard | undefined {
  if (appButton === false) return undefined
  return new InlineKeyboard().url(t('start-btn-group_style'), deepLink.forSettings(username, groupId))
}

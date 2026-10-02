import type { MessageEntity } from 'grammy/types'
import type { QuoteMessage } from '../../services/quote-api/types'
import type {
  QuoteChecklist,
  QuoteGift,
  QuoteGiftSticker,
  QuoteGiveaway,
} from '../../services/quote-api/special-types'
import type { QuoteLabels } from './labels'
import { isTopicRoot, resolveTopic, rgbToHex, type TopicMessageLike } from './topics'

/*
 * Checklists, gifts, giveaways and stories: Telegram message types with no
 * text/media of their own. Each converts into a renderer card payload
 * (quote-api cards.js) plus a plain-text fallback in `text/entities` for
 * renderers that predate the cards. Also hosts the forum-topic hook (topic
 * header + "the topic root is not a reply").
 *
 * The Bot API shapes below are structural (grammY's types may lag Bot API 10.x).
 */

// ---- Bot API structural views -------------------------------------------------

interface StickerLike {
  file_id: string
  is_animated?: boolean
  is_video?: boolean
  thumbnail?: { file_id: string }
  thumb?: { file_id: string }
}

interface ChatLike {
  id?: number
  title?: string
  first_name?: string
  last_name?: string
  username?: string
}

interface ChecklistTaskLike {
  id?: number
  text: string
  text_entities?: MessageEntity[]
  completed_by_user?: unknown
  completed_by_chat?: unknown
  completion_date?: number
}

interface ChecklistLike {
  title: string
  title_entities?: MessageEntity[]
  tasks?: ChecklistTaskLike[]
  others_can_add_tasks?: boolean
  others_can_mark_tasks_as_done?: boolean
}

interface GiftInfoLike {
  gift: { sticker?: StickerLike; star_count?: number }
  text?: string
  entities?: MessageEntity[]
}

interface UniqueGiftInfoLike {
  gift: {
    base_name: string
    name?: string
    number: number
    model: { name: string; sticker?: StickerLike }
    symbol?: { name: string; sticker?: StickerLike }
    backdrop: {
      name: string
      colors: { center_color: number; edge_color: number; symbol_color: number; text_color: number }
    }
  }
  text?: string
  entities?: MessageEntity[]
}

interface GiveawayLike {
  chats?: ChatLike[]
  winners_selection_date?: number
  winner_count: number
  prize_description?: string
  prize_star_count?: number
  premium_subscription_month_count?: number
}

interface GiveawayWinnersLike extends GiveawayLike {
  chat?: ChatLike
  winners?: ChatLike[]
  additional_chat_count?: number
  unclaimed_prize_count?: number
  was_refunded?: boolean
}

interface GiveawayCompletedLike {
  winner_count: number
  unclaimed_prize_count?: number
  is_star_giveaway?: boolean
  giveaway_message?: { giveaway?: GiveawayLike }
}

/** Every field this module reads off a message (native or server-fetched). */
export interface SpecialTypesSource extends TopicMessageLike {
  text?: string
  caption?: string
  checklist?: ChecklistLike
  checklist_tasks_done?: { marked_as_done_task_ids?: number[]; marked_as_not_done_task_ids?: number[] }
  checklist_tasks_added?: { tasks?: ChecklistTaskLike[] }
  gift?: GiftInfoLike
  gift_upgrade_sent?: GiftInfoLike
  unique_gift?: UniqueGiftInfoLike
  giveaway?: GiveawayLike
  giveaway_winners?: GiveawayWinnersLike
  giveaway_completed?: GiveawayCompletedLike
  giveaway_created?: { prize_star_count?: number }
  /** Forwarded story. */
  story?: { id?: number; chat?: ChatLike }
  /** Reply to a story (Bot API gives only {chat, id} — no media). */
  reply_to_story?: { id?: number; chat?: ChatLike }
}

// ---- Labels -------------------------------------------------------------------

/** Localized strings for these types (Fluent `quote-gift*`, `quote-giveaway*`, `quote-checklist*`). */
export interface SpecialLabels {
  gift: string
  giftUpgrade: string
  giftUnique: string
  checklist: string
  stars: (count: number) => string
  giveaway: string
  giveawayWinners: string
  giveawayCompleted: string
  giveawayCreated: string
  /** "5× Telegram Premium · 3 months". */
  premium: (count: number, months: number) => string
  winnerCount: (count: number) => string
  /** "Results on Oct 12, 2026" — the date is formatted by Fluent's DATETIME. */
  giveawayDate: (unix: number) => string
  checklistProgress: (done: number, total: number) => string
  tasksDone: (count: number) => string
  tasksNotDone: (count: number) => string
  tasksAdded: (count: number) => string
}

const plural = (n: number, one: string, many: string): string => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`

export const DEFAULT_SPECIAL_LABELS: SpecialLabels = {
  gift: 'Gift',
  giftUpgrade: 'Gift upgrade',
  giftUnique: 'Collectible gift',
  checklist: 'Checklist',
  stars: (n) => plural(n, 'Star', 'Stars'),
  giveaway: 'Giveaway',
  giveawayWinners: 'Giveaway winners',
  giveawayCompleted: 'Giveaway completed',
  giveawayCreated: 'Giveaway scheduled',
  premium: (count, months) => `${count}× Telegram Premium · ${plural(months, 'month', 'months')}`,
  winnerCount: (n) => plural(n, 'winner', 'winners'),
  giveawayDate: (unix) =>
    `Results on ${new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`,
  checklistProgress: (done, total) => `${done} of ${total} completed`,
  tasksDone: (n) => `Marked ${plural(n, 'task', 'tasks')} as done`,
  tasksNotDone: (n) => `Marked ${plural(n, 'task', 'tasks')} as not done`,
  tasksAdded: (n) => `Added ${plural(n, 'task', 'tasks')}`,
}

type Translate = (key: string, args?: Record<string, string | number>) => string

/** Builds the labels from a Fluent translator (numbers stay numbers → plural rules + NUMBER/DATETIME). */
export function specialLabelsFromTranslator(t: Translate): SpecialLabels {
  return {
    gift: t('quote-gift'),
    giftUpgrade: t('quote-gift-upgrade'),
    giftUnique: t('quote-gift-unique'),
    checklist: t('quote-checklist'),
    stars: (count) => t('quote-stars', { count }),
    giveaway: t('quote-giveaway'),
    giveawayWinners: t('quote-giveaway-winners'),
    giveawayCompleted: t('quote-giveaway-completed'),
    giveawayCreated: t('quote-giveaway-created'),
    premium: (count, months) => t('quote-giveaway-premium', { count, months }),
    winnerCount: (count) => t('quote-giveaway-winner-count', { count }),
    // Fluent's DATETIME takes epoch milliseconds.
    giveawayDate: (unix) => t('quote-giveaway-date', { date: unix * 1000 }),
    checklistProgress: (done, total) => t('quote-checklist-progress', { done, total }),
    tasksDone: (count) => t('quote-checklist-done', { count }),
    tasksNotDone: (count) => t('quote-checklist-undone', { count }),
    tasksAdded: (count) => t('quote-checklist-added', { count }),
  }
}

const specialLabelsOf = (labels: QuoteLabels | undefined): SpecialLabels => labels?.special ?? DEFAULT_SPECIAL_LABELS
/** labels.kinds.story without a value import of labels.ts (it imports this module). */
const storyLabel = (labels: QuoteLabels | undefined): string => labels?.kinds.story ?? 'Story'

// ---- Helpers ------------------------------------------------------------------

/** Appends text runs while shifting their entities (UTF-16 offsets, like JS strings). */
class TextBuilder {
  text = ''
  entities: MessageEntity[] = []

  add(text: string, entities?: MessageEntity[], bold = false): this {
    const offset = this.text.length
    if (bold && text) this.entities.push({ type: 'bold', offset, length: text.length })
    for (const e of entities ?? []) this.entities.push({ ...e, offset: e.offset + offset })
    this.text += text
    return this
  }

  line(text: string, entities?: MessageEntity[], bold = false): this {
    if (this.text) this.add('\n')
    return this.add(text, entities, bold)
  }

  done(): { text: string; entities?: MessageEntity[] } {
    return this.entities.length ? { text: this.text, entities: this.entities } : { text: this.text }
  }
}

const isDone = (t: ChecklistTaskLike): boolean =>
  Boolean(t.completed_by_user || t.completed_by_chat || (t.completion_date && t.completion_date > 0))

const chatName = (c: ChatLike | undefined): string =>
  c ? c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || (c.username ? `@${c.username}` : '') : ''

/** "A, B, C +N" — at most `max` names. */
function nameList(names: string[], max: number, total = names.length): string {
  const shown = names.filter(Boolean).slice(0, max)
  const extra = Math.max(0, total - shown.length)
  return shown.join(', ') + (extra > 0 ? ` +${extra}` : '')
}

function giftSticker(s: StickerLike | undefined): QuoteGiftSticker | undefined {
  if (!s?.file_id) return undefined
  const out: QuoteGiftSticker = { file_id: s.file_id }
  if (s.is_animated) out.is_animated = true
  if (s.is_video) out.is_video = true
  const thumb = s.thumbnail ?? s.thumb
  if (thumb?.file_id) out.thumb = { file_id: thumb.file_id }
  return out
}

/** Colors arrive as RGB24 ints; anything malformed falls back to a neutral backdrop. */
const color = (v: number | undefined, fallback: string): string => rgbToHex(v) ?? fallback

// ---- Converters ---------------------------------------------------------------

/** Max tasks carried in the payload (Telegram's own cap is 30). */
const MAX_TASKS = 30

export function convertChecklist(c: ChecklistLike, labels?: QuoteLabels): {
  checklist: QuoteChecklist
  fallback: { text: string; entities?: MessageEntity[] }
} {
  const sl = specialLabelsOf(labels)
  const tasks = (c.tasks ?? []).slice(0, MAX_TASKS).map((t) => {
    const task: QuoteChecklist['tasks'][number] = { text: t.text ?? '', done: isDone(t) }
    if (t.text_entities?.length) task.entities = t.text_entities
    return task
  })
  const done = tasks.filter((t) => t.done).length
  const checklist: QuoteChecklist = { title: c.title || sl.checklist, tasks }
  if (c.title_entities?.length) checklist.title_entities = c.title_entities
  if (c.others_can_mark_tasks_as_done) checklist.othersCanMarkDone = true
  if (tasks.length > 0) checklist.footer = sl.checklistProgress(done, tasks.length)

  const b = new TextBuilder().add(checklist.title, c.title ? c.title_entities : undefined, true)
  for (const t of tasks) b.line(t.done ? '☑ ' : '☐ ').add(t.text, t.entities)
  return { checklist, fallback: b.done() }
}

export function convertGift(info: GiftInfoLike, title: string): QuoteGift {
  const gift: QuoteGift = { kind: 'regular', title }
  const sticker = giftSticker(info.gift?.sticker)
  if (sticker) gift.sticker = sticker
  if (typeof info.gift?.star_count === 'number') gift.starCount = info.gift.star_count
  if (info.text) gift.text = info.text
  if (info.text && info.entities?.length) gift.entities = info.entities
  return gift
}

export function convertUniqueGift(info: UniqueGiftInfoLike): QuoteGift {
  const g = info.gift
  const colors = g.backdrop?.colors
  const gift: QuoteGift = {
    kind: 'unique',
    name: `${g.base_name} #${g.number}`,
    attributes: [g.model?.name, g.backdrop?.name, g.symbol?.name].filter(Boolean).join(' · '),
    model: { name: g.model?.name ?? '' },
    backdrop: {
      name: g.backdrop?.name ?? '',
      centerColor: color(colors?.center_color, '#5a6b8c'),
      edgeColor: color(colors?.edge_color, '#2c3650'),
      symbolColor: color(colors?.symbol_color, '#1c2338'),
      textColor: color(colors?.text_color, '#ffffff'),
    },
  }
  const modelSticker = giftSticker(g.model?.sticker)
  if (modelSticker) gift.model.sticker = modelSticker
  if (g.symbol) {
    gift.symbol = { name: g.symbol.name }
    const symbolSticker = giftSticker(g.symbol.sticker)
    if (symbolSticker) gift.symbol.sticker = symbolSticker
  }
  if (info.text) gift.text = info.text
  if (info.text && info.entities?.length) gift.entities = info.entities
  return gift
}

/** Prize line(s): additional description first, then the Premium/Stars prize. */
function prizeText(g: GiveawayLike, sl: SpecialLabels): string | undefined {
  const main =
    typeof g.prize_star_count === 'number' && g.prize_star_count > 0
      ? `⭐ ${sl.stars(g.prize_star_count)}`
      : g.premium_subscription_month_count
        ? sl.premium(g.winner_count, g.premium_subscription_month_count)
        : undefined
  const parts = [g.prize_description, main].filter((p): p is string => Boolean(p))
  return parts.length ? parts.join('\n') : undefined
}

function metaLine(g: GiveawayLike, sl: SpecialLabels): string {
  const parts = [sl.winnerCount(g.winner_count)]
  if (g.winners_selection_date) parts.push(sl.giveawayDate(g.winners_selection_date))
  return parts.join(' · ')
}

export function convertGiveaway(src: SpecialTypesSource, labels?: QuoteLabels): QuoteGiveaway | undefined {
  const sl = specialLabelsOf(labels)
  if (src.giveaway) {
    const g = src.giveaway
    const out: QuoteGiveaway = { kind: 'giveaway', title: sl.giveaway, meta: [metaLine(g, sl)] }
    const prize = prizeText(g, sl)
    if (prize) out.prize = prize
    const chats = (g.chats ?? []).map(chatName)
    if (chats.length) out.meta!.push(nameList(chats, 3))
    return out
  }
  if (src.giveaway_winners) {
    const g = src.giveaway_winners
    const out: QuoteGiveaway = { kind: 'winners', title: sl.giveawayWinners, meta: [metaLine(g, sl)] }
    const prize = prizeText(g, sl)
    if (prize) out.prize = prize
    const names = (g.winners ?? []).map(chatName)
    if (names.length) out.winners = nameList(names, 3, Math.max(g.winner_count, names.length))
    return out
  }
  if (src.giveaway_completed) {
    const g = src.giveaway_completed
    const out: QuoteGiveaway = { kind: 'completed', title: sl.giveawayCompleted, meta: [sl.winnerCount(g.winner_count)] }
    const original = g.giveaway_message?.giveaway
    const prize = original ? prizeText(original, sl) : undefined
    if (prize) out.prize = prize
    return out
  }
  return undefined
}

function giveawayFallback(g: QuoteGiveaway): { text: string; entities?: MessageEntity[] } {
  const b = new TextBuilder().add('🎁 ').add(g.title, undefined, true)
  if (g.prize) b.line(g.prize)
  if (g.winners) b.line(`🏆 ${g.winners}`)
  for (const m of g.meta ?? []) b.line(m)
  return b.done()
}

function giftFallback(gift: QuoteGift, sl: SpecialLabels): { text: string; entities?: MessageEntity[] } {
  const head = gift.kind === 'unique' ? gift.name : gift.starCount ? `${gift.title} · ⭐ ${gift.starCount.toLocaleString('en-US')}` : gift.title
  const b = new TextBuilder().add('🎁 ').add(head || sl.gift, undefined, true)
  if (gift.text) b.line(gift.text, gift.entities)
  return b.done()
}

/** One short service line for checklist_tasks_done / _added and giveaway_created. */
function serviceLine(src: SpecialTypesSource, sl: SpecialLabels): string | undefined {
  if (src.checklist_tasks_done) {
    const d = src.checklist_tasks_done
    const parts: string[] = []
    if (d.marked_as_done_task_ids?.length) parts.push(sl.tasksDone(d.marked_as_done_task_ids.length))
    if (d.marked_as_not_done_task_ids?.length) parts.push(sl.tasksNotDone(d.marked_as_not_done_task_ids.length))
    return parts.length ? `☑️ ${parts.join(' · ')}` : undefined
  }
  if (src.checklist_tasks_added) {
    const n = src.checklist_tasks_added.tasks?.length ?? 0
    return n > 0 ? `➕ ${sl.tasksAdded(n)}` : undefined
  }
  if (src.giveaway_created) {
    const stars = src.giveaway_created.prize_star_count
    return `🎁 ${sl.giveawayCreated}${stars ? ` · ⭐ ${sl.stars(stars)}` : ''}`
  }
  return undefined
}

// ---- Public API -----------------------------------------------------------------

/** True if the message is one of the types handled here (counts as quotable content). */
export function hasSpecialTypeContent(m: object): boolean {
  const s = m as SpecialTypesSource
  return Boolean(
    s.checklist ||
      s.gift ||
      s.gift_upgrade_sent ||
      s.unique_gift ||
      s.giveaway ||
      s.giveaway_winners ||
      s.giveaway_completed ||
      s.giveaway_created ||
      s.checklist_tasks_done?.marked_as_done_task_ids?.length ||
      s.checklist_tasks_done?.marked_as_not_done_task_ids?.length ||
      s.checklist_tasks_added?.tasks?.length ||
      s.story,
  )
}

/** One-line label for a reply block pointing at one of these messages, or undefined. */
export function specialReplyLabel(m: object, labels?: QuoteLabels): string | undefined {
  const s = m as SpecialTypesSource
  const sl = specialLabelsOf(labels)
  if (s.checklist) return `☑️ ${s.checklist.title || sl.checklist}`
  if (s.unique_gift?.gift) return `🎁 ${s.unique_gift.gift.base_name} #${s.unique_gift.gift.number}`
  if (s.gift) return `🎁 ${sl.gift}`
  if (s.gift_upgrade_sent) return `🎁 ${sl.giftUpgrade}`
  if (s.giveaway) return `🎁 ${sl.giveaway}`
  if (s.giveaway_winners) return `🏆 ${sl.giveawayWinners}`
  if (s.giveaway_completed) return `🎁 ${sl.giveawayCompleted}`
  return serviceLine(s, sl)
}

export interface ApplySpecialOptions {
  labels?: QuoteLabels
  /** The reply block is requested (the `r` flag). */
  showReply: boolean
  /** A manual partial-quote selection is the message body — keep it. */
  selection?: boolean
}

/**
 * Fills the card payload + fallback text for checklist / gift / giveaway /
 * story messages, the story reply chip, the forum topic header, and drops a
 * reply block that is only the forum topic root. Mutates `out`; call after the
 * regular text/media/reply assembly and before the "unsupported" fallback.
 */
export function applySpecialTypes(out: QuoteMessage, source: object, opts: ApplySpecialOptions): void {
  const src = source as SpecialTypesSource
  const labels = opts.labels
  const sl = specialLabelsOf(labels)

  // ---- Forum topic: header + the root is not a reply ----
  const topic = resolveTopic(src)
  if (topic) out.topic = topic
  if (isTopicRoot(src.reply_to_message)) out.replyMessage = {}

  // ---- Replies to stories / to special messages ----
  if (opts.showReply && src.reply_to_story && !src.reply_to_message) {
    const name = chatName(src.reply_to_story.chat)
    out.replyMessage = { text: storyLabel(labels), media: { kind: 'story' } }
    if (name) out.replyMessage.name = name
    if (typeof src.reply_to_story.chat?.id === 'number') out.replyMessage.chatId = src.reply_to_story.chat.id
  } else if (out.replyMessage && out.replyMessage.name !== undefined && !out.replyMessage.text && src.reply_to_message) {
    const label = specialReplyLabel(src.reply_to_message, labels)
    if (label) out.replyMessage.text = label
  }

  const setFallback = (f: { text: string; entities?: MessageEntity[] }): void => {
    if (opts.selection) return
    out.text = f.text
    if (f.entities?.length) out.entities = f.entities
    else delete out.entities
  }

  // ---- Cards ----
  if (src.checklist) {
    const { checklist, fallback } = convertChecklist(src.checklist, labels)
    out.checklist = checklist
    setFallback(fallback)
    return
  }

  const giftInfo = src.unique_gift ?? src.gift ?? src.gift_upgrade_sent
  if (giftInfo) {
    const gift = src.unique_gift
      ? convertUniqueGift(src.unique_gift)
      : convertGift(giftInfo as GiftInfoLike, src.gift ? sl.gift : sl.giftUpgrade)
    out.gift = gift
    setFallback(giftFallback(gift, sl))
    return
  }

  const giveaway = convertGiveaway(src, labels)
  if (giveaway) {
    out.giveaway = giveaway
    setFallback(giveawayFallback(giveaway))
    return
  }

  // Forwarded story: no media in the Bot API — a labelled row under the forward header.
  if (src.story && !out.text) {
    out.story = { label: storyLabel(labels) }
    const name = chatName(src.story.chat)
    if (name) out.story.chatName = name
    setFallback({ text: `📖 ${storyLabel(labels)}` })
    return
  }

  // Short service lines (checklist progress, scheduled giveaway).
  if (!out.text) {
    const line = serviceLine(src, sl)
    if (line) setFallback({ text: line })
  }
}

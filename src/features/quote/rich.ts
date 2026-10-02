import type { MessageEntity, PhotoSize } from 'grammy/types'
import type { QuoteAlbumItem, QuoteMessage } from '../../services/quote-api/types'
import type {
  QuoteRich,
  QuoteRichBlock,
  QuoteRichListItem,
  QuoteRichTableCell,
  QuoteRichText,
} from '../../services/quote-api/rich-types'
import { ALBUM_MAX, albumItem } from './album'
import type { RawMessage } from './assemble'
import { extractMedia } from './extract-media'
import { DEFAULT_LABELS, type QuoteLabels } from './labels'

// ---------------------------------------------------------------------------
// Telegram Rich Message types (Bot API 10.1–10.3). @grammyjs/types doesn't
// have them yet; this is the subset of the spec we read. Every field is
// optional on purpose: the payload comes off the wire and must never crash
// the converter.
// ---------------------------------------------------------------------------

/** RichText: a string, an array of RichText, or a typed node. */
export type RichText = string | RichText[] | RichTextNode

export interface RichTextNode {
  type: string
  text?: RichText
  /** url */
  url?: string
  /** custom_emoji */
  custom_emoji_id?: string
  alternative_text?: string
  /** mathematical_expression */
  expression?: string
  /** text_mention */
  user?: { id: number; is_bot: boolean; first_name: string }
  /** button */
  button?: { text?: RichText }
  /** Detected-entity payloads, anchors, references, date_time — carried, not needed. */
  hashtag?: string
  cashtag?: string
  username?: string
  email_address?: string
  phone_number?: string
  bank_card_number?: string
  bot_command?: string
  name?: string
  anchor_name?: string
  reference_name?: string
  unix_time?: number
  date_time_format?: string
}

export interface RichBlockCaption {
  text?: RichText
  credit?: RichText
}

export interface RichBlockTableCell {
  text?: RichText
  is_header?: boolean
  colspan?: number
  rowspan?: number
  align?: string
  valign?: string
}

export interface RichBlockListItem {
  label?: string
  blocks?: RichBlock[]
  has_checkbox?: boolean
  is_checked?: boolean
  value?: number
  type?: string
}

interface RichFile {
  file_id?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  duration?: number
  width?: number
  height?: number
  title?: string
  performer?: string
  thumbnail?: PhotoSize
}

export interface RichBlock {
  type: string
  text?: RichText
  size?: number
  language?: string
  expression?: string
  items?: RichBlockListItem[]
  blocks?: RichBlock[]
  credit?: RichText
  caption?: RichBlockCaption | RichText
  cells?: RichBlockTableCell[][]
  is_bordered?: boolean
  is_striped?: boolean
  is_compact?: boolean
  summary?: RichText
  is_open?: boolean
  has_spoiler?: boolean
  photo?: PhotoSize[]
  video?: RichFile
  animation?: RichFile
  audio?: RichFile
  voice_note?: RichFile
  document?: RichFile
  location?: { latitude?: number; longitude?: number }
}

export interface RichMessage {
  blocks?: RichBlock[]
  is_rtl?: boolean
}

/** Mixed into QuoteSource / ReplySource. */
export interface RichSource {
  rich_message?: RichMessage
}

// ---------------------------------------------------------------------------
// Limits. Telegram allows 32k chars / 500 blocks; a sticker shows ~16 lines.
// The renderer applies the real visual budget; these only keep the payload
// (and the flattened fallback text) small.
// ---------------------------------------------------------------------------

export const RICH_LIMITS = {
  blocks: 48,
  listItems: 24,
  tableRows: 12,
  tableCols: 8,
  blockText: 2000,
  fallbackText: 4096,
  /** Spec cap is 16 nesting levels; anything deeper is malformed. */
  depth: 16,
  media: ALBUM_MAX,
} as const

const ELLIPSIS = '…'

// ---------------------------------------------------------------------------
// RichText → plain text + entities
// ---------------------------------------------------------------------------

/** Inline node types that map 1:1 onto a Bot API entity type. */
const SIMPLE_ENTITY: Record<string, MessageEntity['type']> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strikethrough',
  spoiler: 'spoiler',
  code: 'code',
  email_address: 'email',
  phone_number: 'phone_number',
  mention: 'mention',
  hashtag: 'hashtag',
  cashtag: 'cashtag',
  bot_command: 'bot_command',
}

interface Acc {
  text: string
  entities: MessageEntity[]
}

function walk(rt: RichText | undefined, acc: Acc, depth: number): void {
  if (rt === undefined || rt === null || depth > RICH_LIMITS.depth) return
  if (typeof rt === 'string') {
    acc.text += rt
    return
  }
  if (Array.isArray(rt)) {
    for (const part of rt) walk(part, acc, depth + 1)
    return
  }
  if (typeof rt !== 'object') return

  const start = acc.text.length
  const push = (entity: Omit<MessageEntity, 'offset' | 'length'>) => {
    const length = acc.text.length - start
    if (length > 0) acc.entities.push({ ...entity, offset: start, length } as MessageEntity)
  }

  switch (rt.type) {
    case 'custom_emoji': {
      // The renderer draws the sticker over the alternative emoji; an empty
      // alternative would make a zero-length (dropped) entity.
      acc.text += rt.alternative_text || '⭐'
      if (rt.custom_emoji_id) push({ type: 'custom_emoji', custom_emoji_id: rt.custom_emoji_id } as MessageEntity)
      return
    }
    case 'mathematical_expression':
      acc.text += rt.expression ?? ''
      push({ type: 'code' })
      return
    case 'anchor':
      return
    case 'button':
      walk(rt.button?.text, acc, depth + 1)
      push({ type: 'text_link', url: 'tg://button' } as MessageEntity)
      return
    case 'url':
      walk(rt.text, acc, depth + 1)
      if (rt.url) push({ type: 'text_link', url: rt.url } as MessageEntity)
      return
    case 'text_mention':
      walk(rt.text, acc, depth + 1)
      if (rt.user) push({ type: 'text_mention', user: rt.user } as MessageEntity)
      return
    default: {
      walk(rt.text, acc, depth + 1)
      const type = SIMPLE_ENTITY[rt.type]
      // marked / sub / superscript / date_time / references: plain text — the
      // renderer has no look for them and a sticker doesn't need one.
      if (type) push({ type } as MessageEntity)
    }
  }
}

/** Sorted the way Telegram sends them: by offset, outer (longer) first. */
function sortEntities(entities: MessageEntity[]): MessageEntity[] {
  return entities
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.offset - b.e.offset || b.e.length - a.e.length || a.i - b.i)
    .map(({ e }) => e)
}

/** Flattens a RichText tree into plain text + entities (UTF-16 offsets). */
export function richTextToEntities(rt: RichText | undefined): QuoteRichText {
  const acc: Acc = { text: '', entities: [] }
  walk(rt, acc, 0)
  return { text: acc.text, entities: sortEntities(acc.entities) }
}

/** Shifts entities by `delta` (concatenation). */
function shift(entities: MessageEntity[] | undefined, delta: number): MessageEntity[] {
  return (entities ?? []).map((e) => ({ ...e, offset: e.offset + delta }))
}

/**
 * Cuts a text to `max` UTF-16 units without splitting a surrogate pair,
 * clipping (or dropping) entities past the cut and appending "…".
 */
export function truncateRichText(t: QuoteRichText, max: number): QuoteRichText {
  if (t.text.length <= max) return t
  let cut = Math.max(0, max - ELLIPSIS.length)
  const code = t.text.charCodeAt(cut - 1)
  if (code >= 0xd800 && code <= 0xdbff) cut-- // high surrogate left alone
  const entities: MessageEntity[] = []
  for (const e of t.entities ?? []) {
    if (e.offset >= cut) continue
    // A custom emoji is atomic: cut in half it would point at garbage.
    if (e.type === 'custom_emoji' && e.offset + e.length > cut) continue
    entities.push(e.offset + e.length > cut ? { ...e, length: cut - e.offset } : e)
  }
  return { text: t.text.slice(0, cut).replace(/\s+$/, '') + ELLIPSIS, entities }
}

function rt(t: RichText | undefined): QuoteRichText {
  return truncateRichText(richTextToEntities(t), RICH_LIMITS.blockText)
}

/** Drops an empty `entities` array — keeps the payload (and test fixtures) tidy. */
function tidy<T extends { entities?: MessageEntity[] }>(o: T): T {
  if (!o.entities?.length) delete o.entities
  return o
}

/** Joins texts with a separator, shifting entities. */
function joinTexts(parts: QuoteRichText[], sep: string): QuoteRichText {
  let text = ''
  const entities: MessageEntity[] = []
  for (const p of parts) {
    if (!p.text) continue
    if (text) text += sep
    entities.push(...shift(p.entities, text.length))
    text += p.text
  }
  return { text, entities }
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

const BULLET_LABELS = new Set(['•', '◦', '▪', '▫', '-', '*', '+', '–', '—', '·'])

function toAlpha(n: number, upper: boolean): string {
  let s = ''
  let v = Math.max(1, Math.floor(n))
  while (v > 0) {
    v--
    s = String.fromCharCode(97 + (v % 26)) + s
    v = Math.floor(v / 26)
  }
  return upper ? s.toUpperCase() : s
}

function toRoman(n: number, upper: boolean): string {
  const map: [number, string][] = [
    [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'],
    [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
  ]
  let v = Math.max(1, Math.min(3999, Math.floor(n)))
  let s = ''
  for (const [k, r] of map) {
    while (v >= k) {
      s += r
      v -= k
    }
  }
  return upper ? s.toUpperCase() : s
}

/** Ordered-list marker ("3.", "c.", "iv.") or undefined for a bullet. */
function listMarker(item: RichBlockListItem, index: number): string | undefined {
  const label = item.label?.trim()
  if (label) {
    if (BULLET_LABELS.has(label)) return undefined
    return /^[0-9a-zA-Z]+$/.test(label) ? `${label}.` : label
  }
  if (typeof item.value !== 'number' && !item.type) return undefined
  const n = item.value ?? index + 1
  switch (item.type) {
    case 'a': return `${toAlpha(n, false)}.`
    case 'A': return `${toAlpha(n, true)}.`
    case 'i': return `${toRoman(n, false)}.`
    case 'I': return `${toRoman(n, true)}.`
    default: return `${n}.`
  }
}

interface Ctx {
  labels: QuoteLabels
  media: RichBlock[]
  /** Nesting guard. */
  depth: number
}

/** Inline (single text) rendition of any block — list items, quotes and fallbacks use it. */
function inlineOf(block: RichBlock, ctx: Ctx): QuoteRichText {
  const out = convertBlock(block, { ...ctx, depth: ctx.depth + 1 })
  return joinTexts(out.map((b) => fallbackOf(b)), '\n')
}

function flattenList(block: RichBlock, depth: number, items: QuoteRichListItem[], ctx: Ctx): void {
  const list = block.items ?? []
  for (let i = 0; i < list.length; i++) {
    const item = list[i]!
    const own: QuoteRichText[] = []
    const nested: RichBlock[] = []
    for (const b of item.blocks ?? []) {
      if (b?.type === 'list') nested.push(b)
      else if (b) own.push(inlineOf(b, ctx))
    }
    const text = truncateRichText(joinTexts(own, '\n'), RICH_LIMITS.blockText)
    const out: QuoteRichListItem = { text: text.text, entities: text.entities, depth }
    const marker = listMarker(item, i)
    if (marker) out.marker = marker
    if (item.has_checkbox) out.check = Boolean(item.is_checked)
    items.push(tidy(out))
    if (ctx.depth + depth < RICH_LIMITS.depth) for (const n of nested) flattenList(n, depth + 1, items, ctx)
  }
}

function captionText(caption: RichBlock['caption']): RichText | undefined {
  if (caption && typeof caption === 'object' && !Array.isArray(caption) && 'text' in caption && !('type' in caption)) {
    return (caption as RichBlockCaption).text
  }
  return caption as RichText | undefined
}

function labelLine(icon: string, text: string): QuoteRichBlock {
  return { type: 'label', text: `${icon} ${text}` }
}

const isMediaBlock = (t: string) => t === 'photo' || t === 'video' || t === 'animation'

/** One Telegram block → zero or more normalized blocks (media goes to ctx.media). */
function convertBlock(block: RichBlock, ctx: Ctx): QuoteRichBlock[] {
  if (!block || typeof block !== 'object' || ctx.depth > RICH_LIMITS.depth) return []
  const k = ctx.labels.kinds
  switch (block.type) {
    case 'paragraph':
      return [tidy({ type: 'paragraph' as const, ...rt(block.text) })]
    case 'heading':
      return [tidy({ type: 'heading' as const, level: Math.min(6, Math.max(1, block.size ?? 1)), ...rt(block.text) })]
    case 'footer':
      return [tidy({ type: 'footer' as const, ...rt(block.text) })]
    case 'pre': {
      const out: QuoteRichBlock = { type: 'pre', text: rt(block.text).text }
      if (block.language) out.language = block.language
      return [out]
    }
    case 'mathematical_expression':
      return [{ type: 'math', text: (block.expression ?? '').slice(0, RICH_LIMITS.blockText) }]
    case 'divider':
      return [{ type: 'divider' }]
    case 'list': {
      const items: QuoteRichListItem[] = []
      flattenList(block, 0, items, ctx)
      const kept = items.slice(0, RICH_LIMITS.listItems)
      const out: QuoteRichBlock = { type: 'list', ordered: Boolean(kept[0]?.marker), items: kept }
      if (items.length > kept.length) out.more = items.length - kept.length
      return kept.length ? [out] : []
    }
    case 'blockquote':
    case 'expandable_blockquote':
    case 'pullquote': {
      const body = block.blocks
        ? truncateRichText(joinTexts(block.blocks.map((b) => inlineOf(b, ctx)), '\n'), RICH_LIMITS.blockText)
        : rt(block.text)
      const out = tidy({ type: 'quote' as const, ...body }) as Extract<QuoteRichBlock, { type: 'quote' }>
      if (block.type === 'pullquote') out.pull = true
      if (block.credit) {
        const credit = rt(block.credit)
        if (credit.text) out.credit = tidy(credit)
      }
      return out.text ? [out] : []
    }
    case 'table': {
      const all = (block.cells ?? []).filter((r) => Array.isArray(r))
      const rows: QuoteRichTableCell[][] = all.slice(0, RICH_LIMITS.tableRows).map((row) =>
        row.slice(0, RICH_LIMITS.tableCols).map((c) => {
          const cell: QuoteRichTableCell = tidy({ ...rt(c?.text) })
          if (c?.is_header) cell.header = true
          if (c?.align === 'left' || c?.align === 'center' || c?.align === 'right') cell.align = c.align
          if (c?.colspan && c.colspan > 1) cell.span = Math.min(c.colspan, RICH_LIMITS.tableCols)
          return cell
        }),
      )
      if (!rows.length) return []
      const out: Extract<QuoteRichBlock, { type: 'table' }> = { type: 'table', rows }
      if (all.length > rows.length) out.more = all.length - rows.length
      if (block.is_compact) out.compact = true
      if (block.is_bordered) out.bordered = true
      if (block.is_striped) out.striped = true
      const cap = captionText(block.caption)
      if (cap) {
        const c = rt(cap)
        if (c.text) out.caption = tidy(c)
      }
      return [out]
    }
    case 'details':
      return [tidy({ type: 'details' as const, ...rt(block.summary), ...(block.is_open ? { open: true } : {}) })]
    case 'thinking': {
      const own = rt(block.text)
      return [tidy({ type: 'thinking' as const, ...(own.text.trim() ? own : { text: ctx.labels.richThinking ?? 'Thinking…' }) })]
    }
    case 'photo':
    case 'video':
    case 'animation':
      ctx.media.push(block)
      return []
    case 'collage':
    case 'slideshow':
      for (const b of block.blocks ?? []) if (b && isMediaBlock(b.type)) ctx.media.push(b)
      return []
    case 'map': {
      const cap = rt(captionText(block.caption)).text
      return [labelLine('📍', cap || k.location)]
    }
    case 'audio': {
      const a = block.audio
      const name = [a?.performer, a?.title].filter(Boolean).join(' — ') || a?.file_name
      return [labelLine('🎵', name || k.audio)]
    }
    case 'voice_note':
      return [labelLine('🎤', k.voice)]
    case 'document':
      return [labelLine('📎', block.document?.file_name || k.document)]
    // buttons / anchor: interactive or invisible — nothing to show on a sticker.
    default:
      return []
  }
}

// ---------------------------------------------------------------------------
// Fallback text (older renderers read `text` + `entities` only)
// ---------------------------------------------------------------------------

function whole(type: MessageEntity['type'], t: QuoteRichText, extra: Partial<MessageEntity> = {}): MessageEntity[] {
  return t.text ? [{ type, offset: 0, length: t.text.length, ...extra } as MessageEntity] : []
}

function prefixed(prefix: string, t: QuoteRichText): QuoteRichText {
  return { text: prefix + t.text, entities: shift(t.entities, prefix.length) }
}

/** Plain text + entities rendition of one normalized block. */
export function fallbackOf(b: QuoteRichBlock): QuoteRichText {
  switch (b.type) {
    case 'paragraph':
    case 'label':
      return { text: b.text, entities: b.entities ?? [] }
    case 'heading':
      return { text: b.text, entities: [...whole('bold', b), ...(b.entities ?? [])] }
    case 'footer':
      return { text: b.text, entities: [...whole('italic', b), ...(b.entities ?? [])] }
    case 'list':
      return joinTexts(
        b.items.map((it) => {
          const mark = it.check === undefined ? (it.marker ?? '•') : it.check ? '☑' : '☐'
          return prefixed(`${'  '.repeat(it.depth)}${mark} `, it)
        }),
        '\n',
      )
    case 'quote': {
      const body = b.credit ? joinTexts([b, prefixed('— ', b.credit)], '\n') : { text: b.text, entities: b.entities ?? [] }
      return { text: body.text, entities: [...whole('blockquote', body), ...(body.entities ?? [])] }
    }
    case 'pre':
      return { text: b.text, entities: whole('pre', b, b.language ? { language: b.language } : {}) }
    case 'math':
      return { text: b.text, entities: whole('pre', b) }
    case 'divider':
      return { text: '———', entities: [] }
    case 'table':
      return joinTexts(
        b.rows.map((row) => {
          const line = joinTexts(row.map((c) => ({ text: c.text || ' ', entities: c.entities })), ' | ')
          return row.every((c) => c.header) ? { text: line.text, entities: [...whole('bold', line), ...line.entities!] } : line
        }),
        '\n',
      )
    case 'details':
      return prefixed('▸ ', b)
    case 'thinking':
      return prefixed('💭 ', b)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ConvertedRich {
  /** Renderer payload; undefined when the message had no text blocks (media only). */
  rich?: QuoteRich
  /** Flattened fallback for renderers without rich support. */
  text: string
  entities: MessageEntity[]
  /** Photo / video / animation blocks, in order (collage/slideshow members included). */
  media: RichBlock[]
}

export function convertRichMessage(msg: RichMessage, labels: QuoteLabels = DEFAULT_LABELS): ConvertedRich {
  const ctx: Ctx = { labels, media: [], depth: 0 }
  const blocks: QuoteRichBlock[] = []
  for (const b of Array.isArray(msg.blocks) ? msg.blocks : []) {
    if (blocks.length >= RICH_LIMITS.blocks) break
    blocks.push(...convertBlock(b, ctx))
  }
  // Leading/trailing/double dividers are noise once media has been lifted out.
  const clean = blocks.filter(
    (b, i, all) => b.type !== 'divider' || (i > 0 && i < all.length - 1 && all[i - 1]!.type !== 'divider'),
  ).slice(0, RICH_LIMITS.blocks)

  const fb = truncateRichText(joinTexts(clean.map(fallbackOf), '\n'), RICH_LIMITS.fallbackText)
  const out: ConvertedRich = { text: fb.text, entities: fb.entities ?? [], media: ctx.media.slice(0, RICH_LIMITS.media) }
  if (clean.length) {
    out.rich = { blocks: clean }
    if (msg.is_rtl) out.rich.rtl = true
  }
  return out
}

/** True when a message carries a rich message with anything in it. */
export function hasRichContent(m: object): boolean {
  const r = (m as RichSource).rich_message
  return Boolean(r && Array.isArray(r.blocks) && r.blocks.length > 0)
}

/** One-line preview for a reply block ("Heading text…"), or undefined. */
export function richPreviewText(m: RichSource, labels: QuoteLabels = DEFAULT_LABELS): string | undefined {
  if (!m.rich_message) return undefined
  const c = convertRichMessage(m.rich_message, labels)
  const first = c.text.split('\n').find((l) => l.trim() && l !== '———')
  if (first) return first
  return c.media.length ? labels.kinds.photo : undefined
}

/** A media block as the structural message shape album.ts / extract-media.ts read. */
function asRaw(b: RichBlock): RawMessage {
  if (b.type === 'photo') return { photo: b.photo }
  if (b.type === 'video') return { video: b.video }
  return { animation: b.animation }
}

/**
 * Applies a source's rich_message to an assembled QuoteMessage: the rich
 * payload, the flattened fallback text, and its media (first block as the
 * bubble media, 2+ as an album) — unless the message already has media.
 */
export function applyRich(out: QuoteMessage, src: RichSource, opts: { labels?: QuoteLabels; crop?: boolean } = {}): void {
  if (!src.rich_message) return
  const c = convertRichMessage(src.rich_message, opts.labels ?? DEFAULT_LABELS)
  if (c.rich) out.rich = c.rich
  if (c.text) {
    out.text = c.text
    if (c.entities.length) out.entities = c.entities
    else delete out.entities
  }

  const hasMedia = Boolean(out.media || out.album || out.voice || out.document || out.audio)
  const media = c.media.filter((b) => (b.type === 'photo' ? b.photo?.length : b.video ?? b.animation))
  if (!hasMedia && media.length > 0) {
    const spoiler = media.some((b) => b.has_spoiler)
    const items = media.map((b) => albumItem(asRaw(b))).filter((x): x is QuoteAlbumItem => x !== null)
    if (items.length >= 2) {
      out.album = items
      delete out.mediaCrop
    } else {
      const ext = extractMedia(asRaw(media[0]!), { hasText: Boolean(out.text), crop: Boolean(opts.crop) })
      Object.assign(out, ext)
    }
    if (spoiler) out.hasMediaSpoiler = true
  }
  if (out.text) delete out.mediaCrop
}

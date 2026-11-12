import { Composer, InlineKeyboard } from 'grammy'
import type { BotContext } from '../../core/types'
import { onlyAdmin } from '../../middlewares/guards'
import { updateGroupSettings } from '../../db/repositories/group-repository'
import { updateUserSettings } from '../../db/repositories/user-repository'
import { freshSettings, refreshSettings } from '../../middlewares/fresh-settings'
import { deepLink } from '../../helpers/deep-link'
import { editPanelText, fromRichMessage, replyEphemeral, replyRichEphemeral } from '../../helpers/ephemeral'
import { i18n } from '../../i18n'
import { DEFAULT_BACKGROUND } from '../quote/color'
import { DEFAULT_STICKER_EMOJI, QUOTE_BACKDROPS, QUOTE_STYLES, type PartialQuoteMode, type QuoteBackdropPref, type QuoteFormatPref, type QuoteStylePref } from '../quote/render'

const ADMIN_STATUSES = new Set(['creator', 'administrator'])

// ---- Presets (pure, exported for tests) ----

export const PARTIAL_MODES: PartialQuoteMode[] = ['framed', 'plain', 'off']
export const FORMATS: QuoteFormatPref[] = ['sticker', 'image', 'png']
export const EMOJI_BRANDS = ['apple', 'google', 'twitter', 'joypixels', 'blob']

/**
 * Background presets shown as colored swatches in the color sub-panel. Deep,
 * Telegram-flavoured tones (the renderer's `//#hex` auto-gradient keeps them
 * rich and readable with white text); `/qcolor` still sets fully custom ones.
 * The default (`//#292232`) maps to 🟣 so an unset background shows a swatch.
 */
export const COLOR_PRESETS = [
  { swatch: '🟣', value: DEFAULT_BACKGROUND }, // deep violet (default)
  { swatch: '🔵', value: '//#17212b' }, // Telegram night blue
  { swatch: '🩵', value: '//#13303a' }, // teal
  { swatch: '🟢', value: '//#15321f' }, // forest green
  { swatch: '🟡', value: '//#3a3110' }, // amber
  { swatch: '🟠', value: '//#3d2410' }, // orange
  { swatch: '🔴', value: '//#3d1620' }, // wine red
  { swatch: '🩷', value: '//#3a1528' }, // magenta pink
  { swatch: '🟤', value: '//#33240f' }, // brown
  { swatch: '⚫', value: '//#1c1c1e' }, // graphite
  { swatch: '🩶', value: '//#2b2f33' }, // slate grey
  { swatch: '⬜', value: 'white' }, // plain white (solid)
  { swatch: '⬛', value: '#17212b' }, // plain dark (solid, Telegram night)
  { swatch: '⚪', value: 'transparent' }, // no background
  { swatch: '🎲', value: 'random' }, // surprise gradient
] as const

/** Auto-quote frequency presets (`randomQuoteGab` ≈ 1-in-N chance; 0 = off). */
export const GAB_PRESETS = [
  { key: 'off', value: 0 },
  { key: 'often', value: 200 },
  { key: 'sometimes', value: 800 },
  { key: 'rarely', value: 2000 },
] as const

export const SUFFIX_PRESETS = ['💜', '🔥', '😎', '🤣', '✨', '🥲', '🤔', '💀']

function nextIn<T>(arr: readonly T[], current: T): T {
  const i = arr.indexOf(current)
  return arr[(i + 1) % arr.length] ?? arr[0]!
}

export function nextPartialMode(mode: PartialQuoteMode): PartialQuoteMode {
  return nextIn(PARTIAL_MODES, mode)
}
export function nextFormat(format: QuoteFormatPref): QuoteFormatPref {
  return nextIn(FORMATS, format)
}
export function nextStyle(style: QuoteStylePref): QuoteStylePref {
  return nextIn(QUOTE_STYLES, style)
}
export function nextBackdrop(backdrop: QuoteBackdropPref): QuoteBackdropPref {
  return nextIn(QUOTE_BACKDROPS, backdrop)
}
export function nextBrand(brand: string): string {
  return nextIn(EMOJI_BRANDS, brand)
}
export function nextGab(value: number): number {
  const i = GAB_PRESETS.findIndex((p) => p.value === value)
  return GAB_PRESETS[(i + 1) % GAB_PRESETS.length]!.value
}

function colorSwatch(value: string): string {
  return COLOR_PRESETS.find((p) => p.value === value)?.swatch ?? '🎨'
}
function gabKey(value: number): string | null {
  return GAB_PRESETS.find((p) => p.value === value)?.key ?? null
}
function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

// ---- View ----

/** Current quote settings, resolved from the group (admin) or the user doc. */
export interface QuoteSettingsView {
  scope: 'group' | 'user'
  partialMode: PartialQuoteMode
  format: QuoteFormatPref
  color: string
  brand: string
  style: QuoteStylePref
  backdrop: QuoteBackdropPref
  suffix: string
  gab: number
  media: boolean
  showReply: boolean
  crop: boolean
  senderTag: boolean
  privacy: boolean
  hidden: boolean
  rate: boolean
  archive: boolean
  appButton: boolean
}

export function resolveView(ctx: BotContext): QuoteSettingsView | null {
  if (ctx.group) {
    const s = ctx.group.settings
    return {
      scope: 'group',
      partialMode: (s?.quote?.partialMode as PartialQuoteMode | undefined) ?? 'framed',
      format: (s?.quote?.format as QuoteFormatPref | undefined) ?? 'sticker',
      color: s?.quote?.backgroundColor ?? DEFAULT_BACKGROUND,
      brand: s?.quote?.emojiBrand ?? 'apple',
      style: (s?.quote?.style as QuoteStylePref | undefined) ?? 'glass',
      backdrop: (s?.quote?.backdrop as QuoteBackdropPref | undefined) ?? 'doodle',
      suffix: s?.quote?.emojiSuffix ?? DEFAULT_STICKER_EMOJI,
      // Missing = off: the gab service reads `randomQuoteGab ?? 0`, so legacy groups
      // without the field never auto-quote — show that instead of the schema default.
      gab: s?.randomQuoteGab ?? 0,
      media: s?.quote?.media ?? false,
      showReply: s?.quote?.showReply ?? false,
      crop: s?.quote?.crop ?? false,
      senderTag: s?.quote?.senderTag ?? true,
      privacy: s?.privacy ?? false,
      hidden: s?.hidden ?? true,
      rate: s?.rate ?? true,
      archive: s?.archive?.storeText ?? true,
      appButton: s?.appButton ?? true,
    }
  }
  if (ctx.user) {
    const s = ctx.user.settings
    return {
      scope: 'user',
      partialMode: (s?.quote?.partialMode as PartialQuoteMode | undefined) ?? 'framed',
      format: (s?.quote?.format as QuoteFormatPref | undefined) ?? 'sticker',
      color: s?.quote?.backgroundColor ?? DEFAULT_BACKGROUND,
      brand: s?.quote?.emojiBrand ?? 'apple',
      style: (s?.quote?.style as QuoteStylePref | undefined) ?? 'glass',
      backdrop: (s?.quote?.backdrop as QuoteBackdropPref | undefined) ?? 'doodle',
      suffix: s?.quote?.emojiSuffix ?? DEFAULT_STICKER_EMOJI,
      gab: 0,
      media: s?.quote?.media ?? false,
      showReply: s?.quote?.showReply ?? false,
      crop: s?.quote?.crop ?? false,
      senderTag: s?.quote?.senderTag ?? true,
      privacy: s?.privacy ?? false,
      hidden: s?.hidden ?? true,
      rate: false,
      archive: false,
      appButton: false,
    }
  }
  return null
}

/** The view a fresh group/user starts with — also what "reset" restores. */
function defaultView(scope: 'group' | 'user'): QuoteSettingsView {
  return {
    scope,
    partialMode: 'framed',
    format: 'sticker',
    color: DEFAULT_BACKGROUND,
    brand: 'apple',
    style: 'glass',
    backdrop: 'doodle',
    suffix: DEFAULT_STICKER_EMOJI,
    gab: scope === 'group' ? 800 : 0,
    media: false,
    showReply: false,
    crop: false,
    senderTag: true,
    privacy: false,
    hidden: true,
    rate: scope === 'group',
    archive: scope === 'group',
    appButton: scope === 'group',
  }
}

/**
 * "Reset" clears the quote look instead of writing the defaults into it: an
 * unset field renders as the default and, in a group, lets each member's own
 * look through — exactly the state a fresh group starts in. Writing explicit
 * defaults pinned every field and silently overrode members' personal styles.
 */
const RESET_QUOTE_UNSET: Record<string, 1> = { 'settings.quote': 1 }
const RESET_USER: Record<string, unknown> = {
  'settings.privacy': false,
  'settings.hidden': true,
}
const RESET_GROUP: Record<string, unknown> = {
  ...RESET_USER,
  'settings.rate': true,
  'settings.randomQuoteGab': 800,
  'settings.archive.storeText': true,
  'settings.appButton': true,
}

// ---- Categories ----

/** Each setting lives in one category sub-panel, which carries its description. */
export type Category = 'appearance' | 'content' | 'privacy' | 'group'

const CATEGORY_OF: Record<string, Category> = {
  format: 'appearance',
  brand: 'appearance',
  style: 'appearance',
  backdrop: 'appearance',
  partial: 'content',
  reply: 'content',
  media: 'content',
  crop: 'content',
  sendertag: 'content',
  privacy: 'privacy',
  hidden: 'privacy',
  rate: 'group',
  gab: 'group',
  archive: 'group',
  appbutton: 'group',
}

// ---- Keyboards (pure given a view + translator) ----

type Translate = (key: string) => string

/** Top-level menu: one button per category + reset, with explanations on each panel. */
export function buildMainMenu(view: QuoteSettingsView, t: Translate, settingsUrl?: string | null): InlineKeyboard {
  const kb = new InlineKeyboard()
  // First row: live-preview settings in the Mini App — the primary way to set
  // things up; the in-chat categories below stay as the quick/legacy path.
  // Groups can hide every app link via `appButton`; the personal (private)
  // scope has no such switch.
  if (settingsUrl && (view.scope === 'user' || view.appButton)) kb.url(t('app-open_settings'), settingsUrl).row()
  kb.text(t('qs-cat-appearance'), 'qs:cat:appearance')
    .text(t('qs-cat-content'), 'qs:cat:content')
    .row()
    .text(t('qs-cat-privacy'), 'qs:cat:privacy')
  if (view.scope === 'group') kb.text(t('qs-cat-group'), 'qs:cat:group')
  kb.row().text(t('qs-btn-reset'), 'qs:reset').row()
  kb.text(t('menu-btn-language'), 'menu:language')
  // In a group this menu is the root: the private start screen behind "back"
  // belongs to the user, not the chat, and would surface another group.
  if (view.scope === 'user') kb.text(t('menu-btn-back'), 'menu:main')
  return kb
}

/** A category sub-panel: its controls (showing current values) + back to the menu. */
export function buildCategoryKeyboard(cat: Category, view: QuoteSettingsView, t: Translate): InlineKeyboard {
  const onOff = (b: boolean): string => (b ? t('qs-on') : t('qs-off'))
  const kb = new InlineKeyboard()

  if (cat === 'appearance') {
    kb.text(`${t('qs-row-format')}: ${t(`qs-format-${view.format}`)}`, 'qs:cycle:format').row()
    kb.text(`${t('qs-row-style')}: ${t(`qs-style-${view.style}`)}`, 'qs:cycle:style').row()
    kb.text(`${t('qs-row-backdrop')}: ${t(`qs-backdrop-${view.backdrop}`)}`, 'qs:cycle:backdrop').row()
    kb.text(`${t('qs-row-color')}: ${colorSwatch(view.color)}`, 'qs:color').row()
    kb.text(`${t('qs-row-brand')}: ${capitalize(view.brand)}`, 'qs:cycle:brand').row()
    kb.text(`${t('qs-row-suffix')}: ${view.suffix}`, 'qs:suffix').row()
  } else if (cat === 'content') {
    kb.text(`${t('qs-row-partial')}: ${t(`qs-partial-${view.partialMode}`)}`, 'qs:cycle:partial').row()
    kb.text(`${t('qs-row-reply')}: ${onOff(view.showReply)}`, 'qs:toggle:reply').row()
    kb.text(`${t('qs-row-media')}: ${onOff(view.media)}`, 'qs:toggle:media').row()
    kb.text(`${t('qs-row-crop')}: ${onOff(view.crop)}`, 'qs:toggle:crop').row()
    kb.text(`${t('qs-row-sendertag')}: ${onOff(view.senderTag)}`, 'qs:toggle:sendertag').row()
  } else if (cat === 'privacy') {
    kb.text(`${t('qs-row-privacy')}: ${onOff(view.privacy)}`, 'qs:toggle:privacy').row()
    kb.text(`${t('qs-row-hidden')}: ${onOff(view.hidden)}`, 'qs:toggle:hidden').row()
  } else if (cat === 'group') {
    const gKey = gabKey(view.gab)
    const gabLabel = gKey ? t(`qs-gab-${gKey}`) : String(view.gab)
    kb.text(`${t('qs-row-rate')}: ${onOff(view.rate)}`, 'qs:toggle:rate').row()
    kb.text(`${t('qs-row-gab')}: ${gabLabel}`, 'qs:cycle:gab').row()
    kb.text(`${t('qs-row-archive')}: ${onOff(view.archive)}`, 'qs:toggle:archive').row()
    kb.text(`${t('qs-row-appbutton')}: ${onOff(view.appButton)}`, 'qs:toggle:appbutton').row()
  }

  kb.text(t('menu-btn-back'), 'qs:open')
  return kb
}

/** Emoji-grid picker reused by the appearance sub-panels; back returns there. */
function suffixKeyboard(t: Translate): InlineKeyboard {
  const kb = new InlineKeyboard()
  SUFFIX_PRESETS.forEach((emoji, i) => {
    kb.text(emoji, `qs:suffix:set:${emoji}`)
    if (i % 4 === 3) kb.row()
  })
  kb.row().text(t('menu-btn-back'), 'qs:cat:appearance')
  return kb
}

function colorKeyboard(t: Translate): InlineKeyboard {
  const kb = new InlineKeyboard()
  COLOR_PRESETS.forEach((preset, i) => {
    kb.text(preset.swatch, `qs:color:set:${i}`)
    if (i % 5 === 4) kb.row()
  })
  kb.row().text(t('menu-btn-back'), 'qs:cat:appearance')
  return kb
}

// ---- Rich menu (Bot API 10.1+) ----

/**
 * The whole menu as one rich message: each category is a collapsible section
 * holding its buttons (explanations fold away below them), so there is no screen-hopping —
 * the section being edited stays open, the rest stay folded. Pickers (color,
 * sticker emoji, language) open in place. Built from the same keyboards as the
 * classic menu. Shown only in answer to an ephemeral /qsettings (see
 * replyRichEphemeral); the classic menu serves private chats and older apps.
 */
export interface RichMenuState {
  open?: Category
  picker?: 'color' | 'suffix' | 'lang'
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

type RichButton = { text: string; data?: string; url?: string; style?: 'primary' | 'success' | 'danger' }

function richRow(buttons: RichButton[]): string {
  const html = buttons.map((b) => {
    const style = b.style ? ` style="${b.style}"` : ''
    return b.url
      ? `<tg-button type="url"${style} url="${esc(b.url)}">${esc(b.text)}</tg-button>`
      : `<tg-button type="callback_data"${style} data="${esc(b.data ?? '')}">${esc(b.text)}</tg-button>`
  })
  return `<tg-button-row>${html.join('')}</tg-button-row>`
}

/** Which `qs:toggle:*` buttons are currently on — shown in the "success" style. */
const TOGGLE_ON: Record<string, (v: QuoteSettingsView) => boolean> = {
  media: (v) => v.media,
  reply: (v) => v.showReply,
  crop: (v) => v.crop,
  sendertag: (v) => v.senderTag,
  privacy: (v) => v.privacy,
  hidden: (v) => v.hidden,
  rate: (v) => v.rate,
  archive: (v) => v.archive,
  appbutton: (v) => v.appButton,
}

/** Classic keyboard rows → rich button rows (minus the trailing back row). */
function rowsOf(kb: InlineKeyboard, view: QuoteSettingsView): RichButton[][] {
  return kb.inline_keyboard.slice(0, -1).map((row) =>
    row.flatMap((b) => {
      if (!('callback_data' in b)) return []
      const toggle = b.callback_data.match(/^qs:toggle:(\w+)$/)?.[1]
      const on = toggle ? TOGGLE_ON[toggle]?.(view) : false
      return [{ text: b.text, data: b.callback_data, ...(on ? { style: 'success' as const } : {}) }]
    }),
  ).filter((row) => row.length > 0)
}

/**
 * A panel text ("<b>Title</b>" line + "• item" lines) as rich HTML, without
 * its title — the section summary already carries it.
 */
export function panelBody(panel: string): string {
  const lines = panel.split('\n').slice(1).map((l) => l.trim()).filter(Boolean)
  const items = lines.filter((l) => l.startsWith('•')).map((l) => `<li>${l.replace(/^•\s*/, '')}</li>`)
  const paras = lines.filter((l) => !l.startsWith('•')).map((l) => `<p>${l}</p>`)
  return paras.join('') + (items.length ? `<ul>${items.join('')}</ul>` : '')
}

function languageRows(): RichButton[][] {
  const rows: RichButton[][] = []
  i18n.locales.forEach((code, i) => {
    if (i % 2 === 0) rows.push([]) // two per row: three truncate the longer names on phones
    rows.at(-1)!.push({ text: i18n.t(code, 'language_name'), data: `set_language:${code}` })
  })
  return rows
}

export function buildRichMenu(view: QuoteSettingsView, t: Translate, state: RichMenuState = {}, settingsUrl?: string | null): string {
  const [titleLine = '', ...intro] = t('qs-title').split('\n')
  const parts = [`<h3>${titleLine.replace(/<\/?b>/g, '').trim()}</h3>`, ...intro.map((l) => l.trim()).filter(Boolean).map((l) => `<p>${l}</p>`)]
  if (settingsUrl && (view.scope === 'user' || view.appButton)) {
    parts.push(richRow([{ text: t('app-open_settings'), url: settingsUrl, style: 'primary' }]))
  }

  const cats: Category[] = view.scope === 'group' ? ['appearance', 'content', 'privacy', 'group'] : ['appearance', 'content', 'privacy']
  for (const cat of cats) {
    let rows = rowsOf(buildCategoryKeyboard(cat, view, t), view)
    if (cat === 'appearance' && (state.picker === 'color' || state.picker === 'suffix')) {
      const target = state.picker === 'color' ? 'qs:color' : 'qs:suffix'
      const grid = rowsOf(state.picker === 'color' ? colorKeyboard(t) : suffixKeyboard(t), view)
      rows = rows.flatMap((row) => (row.some((b) => b.data === target) ? grid : [row]))
    }
    const open = state.open === cat || (cat === 'appearance' && (state.picker === 'color' || state.picker === 'suffix'))
    // Controls first; the explanations wait folded underneath, so an open
    // section is a short list of buttons rather than a wall of text.
    const help = `<details><summary>${t('qs-help')}</summary>${panelBody(t(`qs-cat-${cat}-desc`))}</details>`
    parts.push(`<details${open ? ' open' : ''}><summary>${t(`qs-cat-${cat}`)}</summary>${rows.map(richRow).join('')}${help}</details>`)
  }

  if (state.picker === 'lang') parts.push(...languageRows().map(richRow))
  parts.push(
    richRow([
      { text: t('qs-btn-reset'), data: 'qs:reset', style: 'danger' },
      { text: t('menu-btn-language'), data: 'qs:lang' },
    ]),
  )
  return parts.join('')
}

// ---- Rendering ----

function htmlOpts(ctx: BotContext): {
  parse_mode: 'HTML'
  link_preview_options: { is_disabled: true }
  reply_parameters?: { message_id: number; allow_sending_without_reply: true }
} {
  const messageId = ctx.message?.message_id
  return {
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true as const } } : {}),
  }
}

/**
 * Edits the current callback message, or sends a fresh one for the /qsettings
 * command — in a group, visible to the calling admin only.
 */
async function show(ctx: BotContext, bodyKey: string, reply_markup: InlineKeyboard, edit: boolean): Promise<void> {
  const panel = { parse_mode: 'HTML' as const, link_preview_options: { is_disabled: true as const }, reply_markup }
  if (edit && ctx.callbackQuery) return editPanelText(ctx, ctx.t(bodyKey), panel)
  if (await replyEphemeral(ctx, ctx.t(bodyKey), panel)) return
  await ctx.reply(ctx.t(bodyKey), { ...htmlOpts(ctx), reply_markup })
}

function settingsUrlFor(ctx: BotContext, view: QuoteSettingsView): string | null {
  const username = ctx.me?.username
  return username ? deepLink.forSettings(username, view.scope === 'group' ? ctx.group?._id.toString() : undefined) : null
}

/** Re-renders a rich menu in place with the given section/picker open. */
function editRich(ctx: BotContext, view: QuoteSettingsView, state: RichMenuState): Promise<void> {
  return editPanelText(ctx, { html: buildRichMenu(view, (k) => ctx.t(k), state, settingsUrlFor(ctx, view)) })
}

async function renderMain(ctx: BotContext, view: QuoteSettingsView, edit: boolean): Promise<void> {
  const settingsUrl = settingsUrlFor(ctx, view)
  if (edit && fromRichMessage(ctx)) return editRich(ctx, view, {})
  if (!edit && (await replyRichEphemeral(ctx, { html: buildRichMenu(view, (k) => ctx.t(k), {}, settingsUrl) }))) return
  await show(ctx, 'qs-title', buildMainMenu(view, (k) => ctx.t(k), settingsUrl), edit)
}

async function renderCategory(ctx: BotContext, cat: Category, view: QuoteSettingsView, edit: boolean): Promise<void> {
  // No group panel in private chats — fall back to the menu.
  if (cat === 'group' && view.scope !== 'group') return renderMain(ctx, view, edit)
  if (edit && fromRichMessage(ctx)) return editRich(ctx, view, { open: cat })
  await show(ctx, `qs-cat-${cat}-desc`, buildCategoryKeyboard(cat, view, (k) => ctx.t(k)), edit)
}

/** In groups, callbacks bypass the command guard — re-check admin here. */
async function isAdmin(ctx: BotContext): Promise<boolean> {
  const inGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'
  if (!inGroup) return true
  if (!ctx.from) return false
  const member = await ctx.getChatMember(ctx.from.id).catch(() => null)
  return Boolean(member && ADMIN_STATUSES.has(member.status))
}

/** Resolves the view only for an authorized admin; answers the callback otherwise. */
async function authorizedView(ctx: BotContext): Promise<QuoteSettingsView | null> {
  if (!(await isAdmin(ctx))) return null
  // Toggles compute "next" from this view — it must reflect Mini App edits.
  await refreshSettings(ctx)
  return resolveView(ctx)
}

/** Persists one settings path to the group (preferred) or user doc. */
async function writeSetting(ctx: BotContext, path: string, value: unknown): Promise<void> {
  if (ctx.group) await updateGroupSettings(ctx.group, { [path]: value })
  else if (ctx.user) await updateUserSettings(ctx.user, { [path]: value })
}

/** Re-renders the settings root in place (e.g. after a language change in a group). */
export async function showSettingsMenu(ctx: BotContext): Promise<void> {
  const view = resolveView(ctx)
  if (view) await renderMain(ctx, view, true)
}

export const quoteSettingsMenu = new Composer<BotContext>()

// /qsettings — open the interactive quote-settings menu.
quoteSettingsMenu.command('qsettings', onlyAdmin, freshSettings, async (ctx) => {
  const view = resolveView(ctx)
  if (view) await renderMain(ctx, view, false)
})

// Top-level menu (also reached from the shell's Settings button).
quoteSettingsMenu.callbackQuery('qs:open', async (ctx) => {
  const view = await authorizedView(ctx)
  if (view) await renderMain(ctx, view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

// Open a category sub-panel.
quoteSettingsMenu.callbackQuery(/^qs:cat:(appearance|content|privacy|group)$/, async (ctx) => {
  const view = await authorizedView(ctx)
  if (view) await renderCategory(ctx, ctx.match![1] as Category, view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

// Reset all quote settings to their defaults.
quoteSettingsMenu.callbackQuery('qs:reset', async (ctx) => {
  if (!(await isAdmin(ctx))) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }
  if (ctx.group) await updateGroupSettings(ctx.group, RESET_GROUP, RESET_QUOTE_UNSET)
  else if (ctx.user) await updateUserSettings(ctx.user, RESET_USER, RESET_QUOTE_UNSET)
  await renderMain(ctx, defaultView(ctx.group ? 'group' : 'user'), true)
  await ctx.answerCallbackQuery({ text: ctx.t('qs-reset-done') }).catch(() => {})
})

// Cycle a multi-value setting to its next preset, staying in its category.
quoteSettingsMenu.callbackQuery(/^qs:cycle:(partial|format|style|backdrop|brand|gab)$/, async (ctx) => {
  const key = ctx.match?.[1]
  const view = await authorizedView(ctx)
  if (!view || !key) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }
  if (key === 'partial') {
    view.partialMode = nextPartialMode(view.partialMode)
    await writeSetting(ctx, 'settings.quote.partialMode', view.partialMode)
  } else if (key === 'format') {
    view.format = nextFormat(view.format)
    await writeSetting(ctx, 'settings.quote.format', view.format)
  } else if (key === 'style') {
    view.style = nextStyle(view.style)
    await writeSetting(ctx, 'settings.quote.style', view.style)
  } else if (key === 'backdrop') {
    view.backdrop = nextBackdrop(view.backdrop)
    await writeSetting(ctx, 'settings.quote.backdrop', view.backdrop)
  } else if (key === 'brand') {
    view.brand = nextBrand(view.brand)
    await writeSetting(ctx, 'settings.quote.emojiBrand', view.brand)
  } else if (key === 'gab' && view.scope === 'group') {
    view.gab = nextGab(view.gab)
    await writeSetting(ctx, 'settings.randomQuoteGab', view.gab)
  }
  await renderCategory(ctx, CATEGORY_OF[key]!, view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

// Flip a boolean setting, staying in its category.
quoteSettingsMenu.callbackQuery(/^qs:toggle:(media|reply|crop|sendertag|privacy|hidden|rate|archive|appbutton)$/, async (ctx) => {
  const key = ctx.match?.[1]
  const view = await authorizedView(ctx)
  if (!view || !key) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }
  if (key === 'media') {
    view.media = !view.media
    await writeSetting(ctx, 'settings.quote.media', view.media)
  } else if (key === 'reply') {
    view.showReply = !view.showReply
    await writeSetting(ctx, 'settings.quote.showReply', view.showReply)
  } else if (key === 'crop') {
    view.crop = !view.crop
    await writeSetting(ctx, 'settings.quote.crop', view.crop)
  } else if (key === 'sendertag') {
    view.senderTag = !view.senderTag
    await writeSetting(ctx, 'settings.quote.senderTag', view.senderTag)
  } else if (key === 'privacy') {
    view.privacy = !view.privacy
    await writeSetting(ctx, 'settings.privacy', view.privacy)
  } else if (key === 'hidden') {
    view.hidden = !view.hidden
    await writeSetting(ctx, 'settings.hidden', view.hidden)
  } else if (key === 'rate' && view.scope === 'group') {
    view.rate = !view.rate
    await writeSetting(ctx, 'settings.rate', view.rate)
  } else if (key === 'archive' && view.scope === 'group') {
    view.archive = !view.archive
    await writeSetting(ctx, 'settings.archive.storeText', view.archive)
  } else if (key === 'appbutton' && view.scope === 'group') {
    view.appButton = !view.appButton
    await writeSetting(ctx, 'settings.appButton', view.appButton)
  }
  await renderCategory(ctx, CATEGORY_OF[key]!, view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

// Open the background-color picker (within Appearance).
quoteSettingsMenu.callbackQuery('qs:color', async (ctx) => {
  if (fromRichMessage(ctx)) {
    const view = await authorizedView(ctx)
    if (view) await editRich(ctx, view, { picker: 'color' })
  } else if (await isAdmin(ctx)) {
    await editPanelText(ctx, ctx.t('qs-color-title'), {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: colorKeyboard((k) => ctx.t(k)),
    })
  }
  await ctx.answerCallbackQuery().catch(() => {})
})

// Language picker, in place (rich menu only — the classic menu opens the shell's picker).
quoteSettingsMenu.callbackQuery('qs:lang', async (ctx) => {
  const view = await authorizedView(ctx)
  if (view) await editRich(ctx, view, { picker: 'lang' })
  await ctx.answerCallbackQuery().catch(() => {})
})

// Pick a background-color preset (by index) and return to Appearance.
quoteSettingsMenu.callbackQuery(/^qs:color:set:(\d+)$/, async (ctx) => {
  const preset = COLOR_PRESETS[Number(ctx.match?.[1])]
  const view = await authorizedView(ctx)
  if (!view || !preset) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }
  view.color = preset.value
  await writeSetting(ctx, 'settings.quote.backgroundColor', preset.value)
  await renderCategory(ctx, 'appearance', view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

// Open the sticker-emoji picker (within Appearance).
quoteSettingsMenu.callbackQuery('qs:suffix', async (ctx) => {
  if (fromRichMessage(ctx)) {
    const view = await authorizedView(ctx)
    if (view) await editRich(ctx, view, { picker: 'suffix' })
  } else if (await isAdmin(ctx)) {
    await editPanelText(ctx, ctx.t('qs-suffix-title'), {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: suffixKeyboard((k) => ctx.t(k)),
    })
  }
  await ctx.answerCallbackQuery().catch(() => {})
})

// Pick a sticker-emoji preset and return to Appearance.
quoteSettingsMenu.callbackQuery(/^qs:suffix:set:(.+)$/, async (ctx) => {
  const emoji = ctx.match?.[1]
  const view = await authorizedView(ctx)
  if (!view || !emoji) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }
  view.suffix = emoji
  await writeSetting(ctx, 'settings.quote.emojiSuffix', emoji)
  await renderCategory(ctx, 'appearance', view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

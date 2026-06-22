import { Composer, InlineKeyboard } from 'grammy'
import type { BotContext } from '../../core/types'
import { onlyAdmin } from '../../middlewares/guards'
import { updateGroupSettings } from '../../db/repositories/group-repository'
import { updateUserSettings } from '../../db/repositories/user-repository'
import { DEFAULT_BACKGROUND } from '../quote/color'
import { DEFAULT_STICKER_EMOJI, type PartialQuoteMode, type QuoteFormatPref } from '../quote/render'

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
  suffix: string
  gab: number
  media: boolean
  showReply: boolean
  crop: boolean
  privacy: boolean
  hidden: boolean
  rate: boolean
  archive: boolean
}

function resolveView(ctx: BotContext): QuoteSettingsView | null {
  if (ctx.group) {
    const s = ctx.group.settings
    return {
      scope: 'group',
      partialMode: (s?.quote?.partialMode as PartialQuoteMode | undefined) ?? 'framed',
      format: (s?.quote?.format as QuoteFormatPref | undefined) ?? 'sticker',
      color: s?.quote?.backgroundColor ?? DEFAULT_BACKGROUND,
      brand: s?.quote?.emojiBrand ?? 'apple',
      suffix: s?.quote?.emojiSuffix ?? DEFAULT_STICKER_EMOJI,
      gab: s?.randomQuoteGab ?? 800,
      media: s?.quote?.media ?? false,
      showReply: s?.quote?.showReply ?? false,
      crop: s?.quote?.crop ?? false,
      privacy: s?.privacy ?? false,
      hidden: s?.hidden ?? true,
      rate: s?.rate ?? true,
      archive: s?.archive?.storeText ?? true,
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
      suffix: s?.quote?.emojiSuffix ?? DEFAULT_STICKER_EMOJI,
      gab: 0,
      media: s?.quote?.media ?? false,
      showReply: s?.quote?.showReply ?? false,
      crop: s?.quote?.crop ?? false,
      privacy: s?.privacy ?? false,
      hidden: s?.hidden ?? true,
      rate: false,
      archive: false,
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
    suffix: DEFAULT_STICKER_EMOJI,
    gab: scope === 'group' ? 800 : 0,
    media: false,
    showReply: false,
    crop: false,
    privacy: false,
    hidden: true,
    rate: scope === 'group',
    archive: scope === 'group',
  }
}

/** Settings paths written by "reset", restoring schema defaults. */
const RESET_QUOTE: Record<string, unknown> = {
  'settings.quote.backgroundColor': DEFAULT_BACKGROUND,
  'settings.quote.emojiBrand': 'apple',
  'settings.quote.emojiSuffix': DEFAULT_STICKER_EMOJI,
  'settings.quote.partialMode': 'framed',
  'settings.quote.format': 'sticker',
  'settings.quote.media': false,
  'settings.quote.showReply': false,
  'settings.quote.crop': false,
  'settings.privacy': false,
  'settings.hidden': true,
}
const RESET_GROUP: Record<string, unknown> = {
  ...RESET_QUOTE,
  'settings.rate': true,
  'settings.randomQuoteGab': 800,
  'settings.archive.storeText': true,
}

// ---- Categories ----

/** Each setting lives in one category sub-panel, which carries its description. */
export type Category = 'appearance' | 'content' | 'privacy' | 'group'

const CATEGORY_OF: Record<string, Category> = {
  format: 'appearance',
  brand: 'appearance',
  partial: 'content',
  reply: 'content',
  media: 'content',
  crop: 'content',
  privacy: 'privacy',
  hidden: 'privacy',
  rate: 'group',
  gab: 'group',
  archive: 'group',
}

// ---- Keyboards (pure given a view + translator) ----

type Translate = (key: string) => string

/** Top-level menu: one button per category + reset, with explanations on each panel. */
export function buildMainMenu(view: QuoteSettingsView, t: Translate): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(t('qs-cat-appearance'), 'qs:cat:appearance')
    .text(t('qs-cat-content'), 'qs:cat:content')
    .row()
    .text(t('qs-cat-privacy'), 'qs:cat:privacy')
  if (view.scope === 'group') kb.text(t('qs-cat-group'), 'qs:cat:group')
  kb.row().text(t('qs-btn-reset'), 'qs:reset').row()
  kb.text(t('menu-btn-language'), 'menu:language').text(t('menu-btn-back'), 'menu:main')
  return kb
}

/** A category sub-panel: its controls (showing current values) + back to the menu. */
export function buildCategoryKeyboard(cat: Category, view: QuoteSettingsView, t: Translate): InlineKeyboard {
  const onOff = (b: boolean): string => (b ? t('qs-on') : t('qs-off'))
  const kb = new InlineKeyboard()

  if (cat === 'appearance') {
    kb.text(`${t('qs-row-format')}: ${t(`qs-format-${view.format}`)}`, 'qs:cycle:format').row()
    kb.text(`${t('qs-row-color')}: ${colorSwatch(view.color)}`, 'qs:color').row()
    kb.text(`${t('qs-row-brand')}: ${capitalize(view.brand)}`, 'qs:cycle:brand').row()
    kb.text(`${t('qs-row-suffix')}: ${view.suffix}`, 'qs:suffix').row()
  } else if (cat === 'content') {
    kb.text(`${t('qs-row-partial')}: ${t(`qs-partial-${view.partialMode}`)}`, 'qs:cycle:partial').row()
    kb.text(`${t('qs-row-reply')}: ${onOff(view.showReply)}`, 'qs:toggle:reply').row()
    kb.text(`${t('qs-row-media')}: ${onOff(view.media)}`, 'qs:toggle:media').row()
    kb.text(`${t('qs-row-crop')}: ${onOff(view.crop)}`, 'qs:toggle:crop').row()
  } else if (cat === 'privacy') {
    kb.text(`${t('qs-row-privacy')}: ${onOff(view.privacy)}`, 'qs:toggle:privacy').row()
    kb.text(`${t('qs-row-hidden')}: ${onOff(view.hidden)}`, 'qs:toggle:hidden').row()
  } else if (cat === 'group') {
    const gKey = gabKey(view.gab)
    const gabLabel = gKey ? t(`qs-gab-${gKey}`) : String(view.gab)
    kb.text(`${t('qs-row-rate')}: ${onOff(view.rate)}`, 'qs:toggle:rate').row()
    kb.text(`${t('qs-row-gab')}: ${gabLabel}`, 'qs:cycle:gab').row()
    kb.text(`${t('qs-row-archive')}: ${onOff(view.archive)}`, 'qs:toggle:archive').row()
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
  kb.row().text(t('qs-suffix-random'), 'qs:suffix:set:random')
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

/** Edits the current callback message, or sends a fresh one for the /qsettings command. */
async function show(ctx: BotContext, bodyKey: string, reply_markup: InlineKeyboard, edit: boolean): Promise<void> {
  if (edit && ctx.callbackQuery) {
    await ctx
      .editMessageText(ctx.t(bodyKey), { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup })
      .catch(() => {})
    return
  }
  await ctx.reply(ctx.t(bodyKey), { ...htmlOpts(ctx), reply_markup })
}

async function renderMain(ctx: BotContext, view: QuoteSettingsView, edit: boolean): Promise<void> {
  await show(ctx, 'qs-title', buildMainMenu(view, (k) => ctx.t(k)), edit)
}

async function renderCategory(ctx: BotContext, cat: Category, view: QuoteSettingsView, edit: boolean): Promise<void> {
  // No group panel in private chats — fall back to the menu.
  if (cat === 'group' && view.scope !== 'group') return renderMain(ctx, view, edit)
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
  if (await isAdmin(ctx)) return resolveView(ctx)
  return null
}

/** Persists one settings path to the group (preferred) or user doc. */
async function writeSetting(ctx: BotContext, path: string, value: unknown): Promise<void> {
  if (ctx.group) await updateGroupSettings(ctx.group._id, { [path]: value })
  else if (ctx.user) await updateUserSettings(ctx.user._id, { [path]: value })
}

export const quoteSettingsMenu = new Composer<BotContext>()

// /qsettings — open the interactive quote-settings menu.
quoteSettingsMenu.command('qsettings', onlyAdmin, async (ctx) => {
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
  if (ctx.group) await updateGroupSettings(ctx.group._id, RESET_GROUP)
  else if (ctx.user) await updateUserSettings(ctx.user._id, RESET_QUOTE)
  await renderMain(ctx, defaultView(ctx.group ? 'group' : 'user'), true)
  await ctx.answerCallbackQuery({ text: ctx.t('qs-reset-done') }).catch(() => {})
})

// Cycle a multi-value setting to its next preset, staying in its category.
quoteSettingsMenu.callbackQuery(/^qs:cycle:(partial|format|brand|gab)$/, async (ctx) => {
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
quoteSettingsMenu.callbackQuery(/^qs:toggle:(media|reply|crop|privacy|hidden|rate|archive)$/, async (ctx) => {
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
  }
  await renderCategory(ctx, CATEGORY_OF[key]!, view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

// Open the background-color picker (within Appearance).
quoteSettingsMenu.callbackQuery('qs:color', async (ctx) => {
  if (await isAdmin(ctx)) {
    await ctx
      .editMessageText(ctx.t('qs-color-title'), {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: colorKeyboard((k) => ctx.t(k)),
      })
      .catch(() => {})
  }
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
  if (await isAdmin(ctx)) {
    await ctx
      .editMessageText(ctx.t('qs-suffix-title'), {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: suffixKeyboard((k) => ctx.t(k)),
      })
      .catch(() => {})
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

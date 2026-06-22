import { Composer, InlineKeyboard } from 'grammy'
import type { BotContext } from '../../core/types'
import { onlyAdmin } from '../../middlewares/guards'
import { updateGroupSettings } from '../../db/repositories/group-repository'
import { updateUserSettings } from '../../db/repositories/user-repository'
import { DEFAULT_BACKGROUND } from '../quote/color'
import { DEFAULT_STICKER_EMOJI, type PartialQuoteMode } from '../quote/render'

const ADMIN_STATUSES = new Set(['creator', 'administrator'])

// ---- Presets (pure, exported for tests) ----

export const PARTIAL_MODES: PartialQuoteMode[] = ['framed', 'plain', 'off']
export const EMOJI_BRANDS = ['apple', 'google', 'twitter', 'joypixels', 'blob']

/** Background presets shown as colored swatches; `/qcolor` still sets custom ones. */
export const COLOR_PRESETS = [
  { swatch: '⚫', value: DEFAULT_BACKGROUND },
  { swatch: '🔵', value: '//#1b2a4a' },
  { swatch: '🟢', value: '//#15321f' },
  { swatch: '🟣', value: '//#2d1b3d' },
  { swatch: '🔴', value: '//#3d1620' },
  { swatch: '⚪', value: 'transparent' },
  { swatch: '🎲', value: 'random' },
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
export function nextBrand(brand: string): string {
  return nextIn(EMOJI_BRANDS, brand)
}
export function nextColor(value: string): string {
  const i = COLOR_PRESETS.findIndex((p) => p.value === value)
  return COLOR_PRESETS[(i + 1) % COLOR_PRESETS.length]!.value
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
  color: string
  brand: string
  suffix: string
  gab: number
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
      color: s?.quote?.backgroundColor ?? DEFAULT_BACKGROUND,
      brand: s?.quote?.emojiBrand ?? 'apple',
      suffix: s?.quote?.emojiSuffix ?? DEFAULT_STICKER_EMOJI,
      gab: s?.randomQuoteGab ?? 800,
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
      color: s?.quote?.backgroundColor ?? DEFAULT_BACKGROUND,
      brand: s?.quote?.emojiBrand ?? 'apple',
      suffix: s?.quote?.emojiSuffix ?? DEFAULT_STICKER_EMOJI,
      gab: 0,
      privacy: s?.privacy ?? false,
      hidden: s?.hidden ?? true,
      rate: false,
      archive: false,
    }
  }
  return null
}

// ---- Keyboards (pure given a view + translator) ----

type Translate = (key: string) => string

/** Builds the hub keyboard. Group-only rows (gab/rate/archive) are omitted for users. */
export function buildHubKeyboard(view: QuoteSettingsView, t: Translate): InlineKeyboard {
  const onOff = (b: boolean): string => (b ? '✓' : '✕')
  const partialLabel = t(`qs-partial-${view.partialMode}`)
  const gKey = gabKey(view.gab)
  const gabLabel = gKey ? t(`qs-gab-${gKey}`) : String(view.gab)

  const kb = new InlineKeyboard()
    .text(`${t('qs-row-partial')}: ${partialLabel}`, 'qs:cycle:partial')
    .row()
    .text(`${t('qs-row-color')}: ${colorSwatch(view.color)}`, 'qs:cycle:color')
    .row()
    .text(`${t('qs-row-brand')}: ${capitalize(view.brand)}`, 'qs:cycle:brand')
    .row()

  if (view.scope === 'group') kb.text(`${t('qs-row-gab')}: ${gabLabel}`, 'qs:cycle:gab').row()
  kb.text(`${t('qs-row-suffix')}: ${view.suffix}`, 'qs:suffix').row()

  kb.text(`${t('qs-row-privacy')}: ${onOff(view.privacy)}`, 'qs:toggle:privacy')
    .text(`${t('qs-row-hidden')}: ${onOff(view.hidden)}`, 'qs:toggle:hidden')
    .row()

  if (view.scope === 'group') {
    kb.text(`${t('qs-row-rate')}: ${onOff(view.rate)}`, 'qs:toggle:rate')
      .text(`${t('qs-row-archive')}: ${onOff(view.archive)}`, 'qs:toggle:archive')
      .row()
  }

  kb.text(t('menu-btn-language'), 'menu:language').text(t('menu-btn-back'), 'menu:main')
  return kb
}

function suffixKeyboard(t: Translate): InlineKeyboard {
  const kb = new InlineKeyboard()
  SUFFIX_PRESETS.forEach((emoji, i) => {
    kb.text(emoji, `qs:suffix:set:${emoji}`)
    if (i % 4 === 3) kb.row()
  })
  kb.row().text(t('qs-suffix-random'), 'qs:suffix:set:random')
  kb.row().text(t('menu-btn-back'), 'qs:open')
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

/** Renders (or re-renders, when editing a callback message) the hub for a given view. */
async function renderFromView(ctx: BotContext, view: QuoteSettingsView, edit: boolean): Promise<void> {
  const reply_markup = buildHubKeyboard(view, (k) => ctx.t(k))
  if (edit && ctx.callbackQuery) {
    await ctx
      .editMessageText(ctx.t('qs-title'), { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup })
      .catch(() => {})
    return
  }
  await ctx.reply(ctx.t('qs-title'), { ...htmlOpts(ctx), reply_markup })
}

async function renderHub(ctx: BotContext, edit: boolean): Promise<void> {
  const view = resolveView(ctx)
  if (view) await renderFromView(ctx, view, edit)
}

/** In groups, callbacks bypass the command guard — re-check admin here. */
async function isAdmin(ctx: BotContext): Promise<boolean> {
  const inGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'
  if (!inGroup) return true
  if (!ctx.from) return false
  const member = await ctx.getChatMember(ctx.from.id).catch(() => null)
  return Boolean(member && ADMIN_STATUSES.has(member.status))
}

/** Persists one settings path to the group (preferred) or user doc. */
async function writeSetting(ctx: BotContext, path: string, value: unknown): Promise<void> {
  if (ctx.group) await updateGroupSettings(ctx.group._id, { [path]: value })
  else if (ctx.user) await updateUserSettings(ctx.user._id, { [path]: value })
}

export const quoteSettingsMenu = new Composer<BotContext>()

// /qsettings — open the interactive quote-settings hub.
quoteSettingsMenu.command('qsettings', onlyAdmin, (ctx) => renderHub(ctx, false))

// Open from the main menu (shell repoints its Settings button here).
quoteSettingsMenu.callbackQuery('qs:open', async (ctx) => {
  if (await isAdmin(ctx)) await renderHub(ctx, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

// Cycle a multi-value setting to its next preset.
quoteSettingsMenu.callbackQuery(/^qs:cycle:(partial|color|brand|gab)$/, async (ctx) => {
  const key = ctx.match?.[1]
  const view = (await isAdmin(ctx)) ? resolveView(ctx) : null
  if (!view || !key) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }
  if (key === 'partial') {
    view.partialMode = nextPartialMode(view.partialMode)
    await writeSetting(ctx, 'settings.quote.partialMode', view.partialMode)
  } else if (key === 'color') {
    view.color = nextColor(view.color)
    await writeSetting(ctx, 'settings.quote.backgroundColor', view.color)
  } else if (key === 'brand') {
    view.brand = nextBrand(view.brand)
    await writeSetting(ctx, 'settings.quote.emojiBrand', view.brand)
  } else if (key === 'gab' && view.scope === 'group') {
    view.gab = nextGab(view.gab)
    await writeSetting(ctx, 'settings.randomQuoteGab', view.gab)
  }
  await renderFromView(ctx, view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

// Flip a boolean setting.
quoteSettingsMenu.callbackQuery(/^qs:toggle:(privacy|hidden|rate|archive)$/, async (ctx) => {
  const key = ctx.match?.[1]
  const view = (await isAdmin(ctx)) ? resolveView(ctx) : null
  if (!view || !key) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }
  if (key === 'privacy') {
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
  await renderFromView(ctx, view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

// Open the sticker-emoji sub-panel.
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

// Pick a sticker-emoji preset and return to the hub.
quoteSettingsMenu.callbackQuery(/^qs:suffix:set:(.+)$/, async (ctx) => {
  const emoji = ctx.match?.[1]
  const view = (await isAdmin(ctx)) ? resolveView(ctx) : null
  if (!view || !emoji) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }
  view.suffix = emoji
  await writeSetting(ctx, 'settings.quote.emojiSuffix', emoji)
  await renderFromView(ctx, view, true)
  await ctx.answerCallbackQuery().catch(() => {})
})

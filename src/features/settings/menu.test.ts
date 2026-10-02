import { describe, it, expect } from 'vitest'
import {
  buildMainMenu,
  buildCategoryKeyboard,
  nextBrand,
  nextStyle,
  nextBackdrop,
  nextFormat,
  nextGab,
  nextPartialMode,
  resolveView,
  COLOR_PRESETS,
  GAB_PRESETS,
  type QuoteSettingsView,
} from './menu'

const view = (over: Partial<QuoteSettingsView> = {}): QuoteSettingsView => ({
  scope: 'group',
  partialMode: 'framed',
  format: 'sticker',
  color: COLOR_PRESETS[0]!.value,
  brand: 'apple',
  style: 'glass',
  backdrop: 'doodle',
  suffix: '💜',
  gab: 800,
  media: false,
  showReply: false,
  crop: false,
  senderTag: true,
  privacy: false,
  hidden: true,
  rate: true,
  archive: true,
  appButton: true,
  ...over,
})

/** All callback_data strings present in a keyboard. */
function callbacks(kb: ReturnType<typeof buildMainMenu>): string[] {
  return kb.inline_keyboard.flat().flatMap((b) => ('callback_data' in b ? [b.callback_data] : []))
}

describe('cyclers', () => {
  it('cycles the image backdrop doodle → mesh → aurora → doodle', () => {
    expect(nextBackdrop('doodle')).toBe('mesh')
    expect(nextBackdrop('mesh')).toBe('aurora')
    expect(nextBackdrop('aurora')).toBe('doodle')
  })

  it('cycles the bubble style glass → classic → glass', () => {
    expect(nextStyle('glass')).toBe('classic')
    expect(nextStyle('classic')).toBe('glass')
  })

  it('cycles the partial-quote mode framed → plain → off → framed', () => {
    expect(nextPartialMode('framed')).toBe('plain')
    expect(nextPartialMode('plain')).toBe('off')
    expect(nextPartialMode('off')).toBe('framed')
  })

  it('cycles emoji brands and wraps around', () => {
    expect(nextBrand('apple')).toBe('google')
    expect(nextBrand('blob')).toBe('apple')
  })

  it('cycles output formats sticker → image → png → sticker', () => {
    expect(nextFormat('sticker')).toBe('image')
    expect(nextFormat('image')).toBe('png')
    expect(nextFormat('png')).toBe('sticker')
  })

  it('cycles gab presets; an unknown value starts at the first', () => {
    expect(nextGab(0)).toBe(GAB_PRESETS[1]!.value)
    expect(nextGab(GAB_PRESETS.at(-1)!.value)).toBe(GAB_PRESETS[0]!.value)
    expect(nextGab(12345)).toBe(GAB_PRESETS[0]!.value)
  })
})

describe('buildMainMenu', () => {
  const t = (k: string): string => k

  it('offers the group category only for a group view', () => {
    expect(callbacks(buildMainMenu(view({ scope: 'group' }), t))).toContain('qs:cat:group')
    expect(callbacks(buildMainMenu(view({ scope: 'user' }), t))).not.toContain('qs:cat:group')
  })

  it('always offers the core categories and reset', () => {
    const cb = callbacks(buildMainMenu(view({ scope: 'user' }), t))
    expect(cb).toEqual(expect.arrayContaining(['qs:cat:appearance', 'qs:cat:content', 'qs:cat:privacy', 'qs:reset']))
  })
})

describe('buildCategoryKeyboard', () => {
  const t = (k: string): string => k

  it('appearance opens the color/suffix pickers and cycles format/brand', () => {
    const cb = callbacks(buildCategoryKeyboard('appearance', view(), t))
    expect(cb).toEqual(expect.arrayContaining(['qs:cycle:format', 'qs:cycle:style', 'qs:cycle:backdrop', 'qs:color', 'qs:cycle:brand', 'qs:suffix']))
    expect(cb).toContain('qs:open') // back to the menu
  })

  it('content groups the partial-mode + behaviour toggles', () => {
    const cb = callbacks(buildCategoryKeyboard('content', view(), t))
    expect(cb).toEqual(
      expect.arrayContaining(['qs:cycle:partial', 'qs:toggle:reply', 'qs:toggle:media', 'qs:toggle:crop', 'qs:toggle:sendertag']),
    )
  })

  it('group panel carries the group-only controls', () => {
    const cb = callbacks(buildCategoryKeyboard('group', view({ scope: 'group' }), t))
    expect(cb).toEqual(expect.arrayContaining(['qs:toggle:rate', 'qs:cycle:gab', 'qs:toggle:archive', 'qs:toggle:appbutton']))
  })
})

describe('COLOR_PRESETS', () => {
  it('has unique values and a distinct swatch each', () => {
    const values = COLOR_PRESETS.map((p) => p.value)
    const swatches = COLOR_PRESETS.map((p) => p.swatch)
    expect(new Set(values).size).toBe(values.length)
    expect(new Set(swatches).size).toBe(swatches.length)
  })
})

describe('settings preview link', () => {
  const url = 'https://t.me/bot/app?startapp=settings_x'
  const t = (k: string) => k
  const firstRow = (kb: ReturnType<typeof buildMainMenu>) => kb.inline_keyboard[0]!

  it('is the first row in the group scope when the app button is on', () => {
    expect(firstRow(buildMainMenu(view(), t, url))).toEqual([{ text: 'app-open_settings', url }])
  })

  it('is hidden in a group that disabled the app button', () => {
    expect(JSON.stringify(buildMainMenu(view({ appButton: false }), t, url).inline_keyboard)).not.toContain(url)
  })

  it('shows in the personal scope', () => {
    expect(firstRow(buildMainMenu(view({ scope: 'user', appButton: false }), t, url))).toEqual([{ text: 'app-open_settings', url }])
  })

  it('is absent without a url', () => {
    expect(firstRow(buildMainMenu(view(), t))[0]).toMatchObject({ callback_data: 'qs:cat:appearance' })
  })
})

describe('auto-quote (gab) in the group view', () => {
  // Mirrors services/gab: a group without the field never auto-quotes.
  const ctxWith = (settings: Record<string, unknown>) => ({ group: { settings } }) as unknown as Parameters<typeof resolveView>[0]

  it('shows a missing value as off', () => {
    expect(resolveView(ctxWith({}))?.gab).toBe(0)
  })

  it('keeps an explicit value', () => {
    expect(resolveView(ctxWith({ randomQuoteGab: 200 }))?.gab).toBe(200)
  })
})

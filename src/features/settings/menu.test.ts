import { describe, it, expect } from 'vitest'
import {
  buildMainMenu,
  buildCategoryKeyboard,
  nextBrand,
  nextFormat,
  nextGab,
  nextPartialMode,
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
  suffix: '💜',
  gab: 800,
  media: false,
  showReply: false,
  crop: false,
  privacy: false,
  hidden: true,
  rate: true,
  archive: true,
  ...over,
})

/** All callback_data strings present in a keyboard. */
function callbacks(kb: ReturnType<typeof buildMainMenu>): string[] {
  return kb.inline_keyboard.flat().flatMap((b) => ('callback_data' in b ? [b.callback_data] : []))
}

describe('cyclers', () => {
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
    expect(cb).toEqual(expect.arrayContaining(['qs:cycle:format', 'qs:color', 'qs:cycle:brand', 'qs:suffix']))
    expect(cb).toContain('qs:open') // back to the menu
  })

  it('content groups the partial-mode + behaviour toggles', () => {
    const cb = callbacks(buildCategoryKeyboard('content', view(), t))
    expect(cb).toEqual(expect.arrayContaining(['qs:cycle:partial', 'qs:toggle:reply', 'qs:toggle:media', 'qs:toggle:crop']))
  })

  it('group panel carries the group-only controls', () => {
    const cb = callbacks(buildCategoryKeyboard('group', view({ scope: 'group' }), t))
    expect(cb).toEqual(expect.arrayContaining(['qs:toggle:rate', 'qs:cycle:gab', 'qs:toggle:archive']))
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

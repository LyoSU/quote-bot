import { describe, it, expect } from 'vitest'
import {
  buildHubKeyboard,
  nextBrand,
  nextGab,
  nextPartialMode,
  COLOR_PRESETS,
  GAB_PRESETS,
  type QuoteSettingsView,
} from './menu'

const view = (over: Partial<QuoteSettingsView> = {}): QuoteSettingsView => ({
  scope: 'group',
  partialMode: 'framed',
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
function callbacks(kb: ReturnType<typeof buildHubKeyboard>): string[] {
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

  it('cycles gab presets; an unknown value starts at the first', () => {
    expect(nextGab(0)).toBe(GAB_PRESETS[1]!.value)
    expect(nextGab(GAB_PRESETS.at(-1)!.value)).toBe(GAB_PRESETS[0]!.value)
    expect(nextGab(12345)).toBe(GAB_PRESETS[0]!.value)
  })
})

describe('buildHubKeyboard', () => {
  const t = (k: string): string => k

  it('shows group-only rows for a group view', () => {
    const cb = callbacks(buildHubKeyboard(view({ scope: 'group' }), t))
    expect(cb).toContain('qs:cycle:gab')
    expect(cb).toContain('qs:toggle:rate')
    expect(cb).toContain('qs:toggle:archive')
  })

  it('omits group-only rows for a personal view', () => {
    const cb = callbacks(buildHubKeyboard(view({ scope: 'user' }), t))
    expect(cb).not.toContain('qs:cycle:gab')
    expect(cb).not.toContain('qs:toggle:rate')
    expect(cb).not.toContain('qs:toggle:archive')
    // Shared rows still present.
    expect(cb).toContain('qs:cycle:partial')
    expect(cb).toContain('qs:toggle:privacy')
    expect(cb).toContain('qs:suffix')
  })

  it('opens the color sub-panel instead of cycling, and offers the default-behaviour toggles', () => {
    const cb = callbacks(buildHubKeyboard(view(), t))
    expect(cb).toContain('qs:color')
    expect(cb).not.toContain('qs:cycle:color')
    expect(cb).toContain('qs:toggle:media')
    expect(cb).toContain('qs:toggle:reply')
    expect(cb).toContain('qs:toggle:crop')
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

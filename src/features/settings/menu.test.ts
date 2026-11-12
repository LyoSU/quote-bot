import { describe, it, expect } from 'vitest'
import {
  buildMainMenu,
  buildRichMenu,
  panelBody,
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

  it('offers back to the start screen only in private — in a group the menu is the root', () => {
    expect(callbacks(buildMainMenu(view({ scope: 'user' }), t))).toContain('menu:main')
    expect(callbacks(buildMainMenu(view({ scope: 'group' }), t))).not.toContain('menu:main')
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

describe('buildRichMenu', () => {
  const t = (k: string): string => (k === 'qs-title' ? '<b>⚙️ Settings</b>\n\nPick a section.' : k)
  const sections = (html: string): string[] => html.match(/<details[^>]*>/g) ?? []

  it('folds every category; the group one only for groups', () => {
    expect(sections(buildRichMenu(view(), t))).toEqual(Array(4).fill('<details>'))
    expect(sections(buildRichMenu(view({ scope: 'user' }), t))).toHaveLength(3)
    expect(buildRichMenu(view(), t)).toContain('<h3>⚙️ Settings</h3><p>Pick a section.</p>')
  })

  it('keeps the edited section open and carries the same callbacks as the classic menu', () => {
    const html = buildRichMenu(view(), t, { open: 'content' })
    expect(html).toContain('<details open><summary>qs-cat-content</summary>')
    expect(html).toContain('data="qs:toggle:media"')
    expect(html).not.toContain('data="qs:open"') // no back rows inside sections
  })

  it('highlights toggles that are on and the destructive reset', () => {
    const html = buildRichMenu(view({ privacy: true, hidden: false }), t)
    expect(html).toContain('style="success" data="qs:toggle:privacy"')
    expect(html).toContain('<tg-button type="callback_data" data="qs:toggle:hidden"')
    expect(html).toContain('style="danger" data="qs:reset"')
  })

  it('opens the color grid in place of the color row, without empty rows', () => {
    const html = buildRichMenu(view(), t, { picker: 'color' })
    expect(html).toContain('<details open><summary>qs-cat-appearance</summary>')
    expect(html).toContain('data="qs:color:set:14"')
    expect(html).not.toContain('data="qs:color"')
    expect(html).not.toContain('<tg-button-row></tg-button-row>')
  })

  it('lists languages in place and escapes button text', () => {
    expect(buildRichMenu(view(), t, { picker: 'lang' })).toContain('data="set_language:uk"')
    const html = buildRichMenu(view({ brand: 'a<b>&' }), t, { open: 'appearance' })
    expect(html).toContain('A&lt;b&gt;&amp;')
  })
})

describe('panelBody', () => {
  it('drops the title and turns bullets into a list', () => {
    expect(panelBody('<b>Title</b>\n\nIntro\n• <b>One</b> — a\n• Two')).toBe('<p>Intro</p><ul><li><b>One</b> — a</li><li>Two</li></ul>')
  })
})

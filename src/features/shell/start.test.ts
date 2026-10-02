import { describe, expect, it, vi } from 'vitest'
import path from 'node:path'
import { I18n } from '@grammyjs/i18n'

vi.mock('../../db/models', () => ({ Group: {}, GroupMember: {}, Quote: {} }))
vi.mock('../../config/env', () => ({ config: { MINI_APP_URL: '', MINI_APP_SHORT_NAME: 'app' } }))
import { groupStartKeyboard, guideKeyboard, newUserKeyboard, pickBestGroup, returningKeyboard } from './start'

const t = (k: string): string => k
type Btn = { text: string; url?: string; callback_data?: string }
const rows = (kb: { inline_keyboard: Btn[][] }): Btn[][] => kb.inline_keyboard

describe('pickBestGroup', () => {
  const titles = new Map<string, string | undefined>([
    ['a', 'Alpha'],
    ['b', 'Beta'],
    ['c', undefined],
  ])
  it('picks the group with the most quotes', () => {
    expect(pickBestGroup([{ group: 'a', count: 3 }, { group: 'b', count: 9 }], titles)).toEqual({ id: 'b', title: 'Beta', count: 9 })
  })
  it('skips untitled groups and zero counts, keeps first on ties', () => {
    expect(pickBestGroup([{ group: 'c', count: 50 }, { group: 'a', count: 4 }, { group: 'b', count: 4 }], titles)?.id).toBe('a')
    expect(pickBestGroup([{ group: 'a', count: 0 }], titles)).toBeNull()
    expect(pickBestGroup([], titles)).toBeNull()
  })
})

describe('keyboards', () => {
  it('new user: add-group row, then style + how-it-works', () => {
    const r = rows(newUserKeyboard(t, 'bot'))
    expect(r).toHaveLength(2)
    expect(r[0]).toHaveLength(1)
    expect(r[0]![0]!.url).toBe('https://t.me/bot?startgroup=add')
    expect(r[1]![0]!.url).toContain('startapp=settings')
    expect(r[1]![1]!.callback_data).toBe('menu:guide')
  })

  it('returning user: opens the best group, falls back to root', () => {
    const withBest = rows(returningKeyboard(t, 'bot', { id: 'abc123', title: 'T', count: 2 }))
    expect(withBest).toHaveLength(3)
    expect(withBest[0]![0]!.url).toContain('startapp=g_abc123')
    expect(withBest[1]![0]!.url).toBe('https://t.me/bot?startgroup=add')
    expect(withBest[2]!.map((b) => b.text)).toEqual(['start-btn-style', 'start-btn-help'])
    expect(rows(returningKeyboard(t, 'bot', null))[0]![0]!.url).not.toContain('startapp')
  })

  it('guide panel keeps every old main-menu entry plus back', () => {
    const data = rows(guideKeyboard(t)).flat().map((b) => b.callback_data)
    expect(data).toEqual(['menu:features', 'qs:open', 'menu:help', 'menu:language', 'menu:main'])
  })

  it('group start: style button only when appButton is not false', () => {
    expect(rows(groupStartKeyboard(t, 'bot', 'gid1', undefined)!)[0]![0]!.url).toContain('startapp=settings_gid1')
    expect(groupStartKeyboard(t, 'bot', 'gid1', true)).toBeDefined()
    expect(groupStartKeyboard(t, 'bot', 'gid1', false)).toBeUndefined()
  })
})

describe('start.* locale strings', () => {
  const i18n = new I18n({ defaultLocale: 'en', fluentBundleOptions: { useIsolating: false } })
  i18n.loadLocalesDirSync(path.join(__dirname, '../../i18n/locales'))
  const keys = ['start-new', 'start-back', 'start-back-generic', 'start-group_ready', 'start-guide_title', 'start-btn-style', 'start-btn-how', 'start-btn-help', 'start-btn-open', 'start-btn-add_more', 'start-btn-group_style']

  it.each(i18n.locales)('%s has every key and a working plural line', (code) => {
    for (const k of keys) expect(i18n.t(code, k), `${code}:${k}`).not.toBe(k)
    for (const count of [1, 2, 5, 21]) {
      const line = i18n.t(code, 'start-back-week', { title: 'Chat', count })
      expect(line).toContain('Chat')
      expect(line.length).toBeGreaterThan(10)
    }
  })
})

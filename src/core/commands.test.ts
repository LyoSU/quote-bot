import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { I18n } from '@grammyjs/i18n'
import { COMMANDS, commandsFor } from './commands'

vi.mock('./logger', () => ({ logger: { warn: vi.fn() } }))

const t = (k: string): string => k

describe('commandsFor', () => {
  it('admins get the member commands plus /qsettings and /lang', () => {
    const member = commandsFor('group', t).map((c) => c.command)
    const admin = commandsFor('admin', t).map((c) => c.command)
    expect(admin).toEqual(expect.arrayContaining(member))
    expect(admin).toEqual(expect.arrayContaining(['qsettings', 'lang']))
    expect(member).not.toContain('qsettings')
  })

  it('marks commands ephemeral in groups only', () => {
    expect(commandsFor('admin', t).find((c) => c.command === 'qsettings')?.is_ephemeral).toBe(true)
    expect(commandsFor('group', t).find((c) => c.command === 'q')?.is_ephemeral).toBeUndefined()
    expect(commandsFor('private', t).some((c) => 'is_ephemeral' in c)).toBe(false)
  })

  it('keeps names valid for setMyCommands', () => {
    for (const c of COMMANDS) expect(c.command).toMatch(/^[a-z0-9_]{1,32}$/)
  })
})

describe('cmd-* locale strings', () => {
  const i18n = new I18n({ defaultLocale: 'en', fluentBundleOptions: { useIsolating: false } })
  i18n.loadLocalesDirSync(path.join(__dirname, '../i18n/locales'))

  it.each(i18n.locales)('%s describes every listed command within 256 chars', (code) => {
    for (const { command } of COMMANDS) {
      const d = i18n.t(code, `cmd-${command}`)
      expect(d, `${code}:${command}`).not.toBe(`cmd-${command}`)
      expect(d.length).toBeLessThanOrEqual(256)
    }
  })
})

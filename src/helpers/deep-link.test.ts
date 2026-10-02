import { describe, expect, it, vi } from 'vitest'

const cfg = vi.hoisted(() => ({ MINI_APP_URL: undefined as string | undefined, MINI_APP_SHORT_NAME: 'app' }))
vi.mock('../config/env', () => ({ config: cfg }))

import { deepLink } from './deep-link'

const gid = '507f1f77bcf86cd799439011'

describe('deep links', () => {
  it('builds t.me startapp links', () => {
    cfg.MINI_APP_URL = undefined
    expect(deepLink.forTop('bot', gid)).toBe(`https://t.me/bot/app?startapp=top_${gid}`)
    expect(deepLink.forGame('bot', gid)).toBe(`https://t.me/bot/app?startapp=game_${gid}`)
    expect(deepLink.forSettings('bot', gid)).toBe(`https://t.me/bot/app?startapp=settings_${gid}`)
    expect(deepLink.forSettings('bot')).toBe('https://t.me/bot/app?startapp=settings')
  })

  it('uses MINI_APP_URL when configured', () => {
    cfg.MINI_APP_URL = 'https://app.example.com'
    expect(deepLink.forTop('bot', gid)).toBe(`https://app.example.com?startapp=top_${gid}`)
    cfg.MINI_APP_URL = undefined
  })

  it('keeps payloads within Telegram limits', () => {
    for (const url of [deepLink.forTop('b', gid), deepLink.forGame('b', gid), deepLink.forSettings('b', gid)]) {
      const param = new URL(url).searchParams.get('startapp')!
      expect(param.length).toBeLessThanOrEqual(64)
      expect(param).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('drops an unsafe payload instead of emitting a broken link', () => {
    expect(deepLink.forTop('bot', 'a b&c')).toBe('https://t.me/bot/app')
    expect(deepLink.forGame('bot', 'x'.repeat(70))).toBe('https://t.me/bot/app')
  })
})

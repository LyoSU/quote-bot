import { describe, expect, it, vi } from 'vitest'

const cfg = vi.hoisted(() => ({ MINI_APP_URL: undefined as string | undefined }))
vi.mock('../../config/env', () => ({ config: cfg }))
vi.mock('../../db/models', () => ({ Quote: {} }))
import { appResultsButton } from './index'
import type { BotContext } from '../../core/types'

const ctx = { t: (k: string) => k } as unknown as BotContext

describe('appResultsButton', () => {
  it('is absent without MINI_APP_URL', () => {
    cfg.MINI_APP_URL = undefined
    expect(appResultsButton(ctx)).toEqual({})
  })
  it('is a web_app button with a direct https URL', () => {
    cfg.MINI_APP_URL = 'https://app.test'
    expect(appResultsButton(ctx)).toEqual({ button: { text: 'app-inline_open', web_app: { url: 'https://app.test' } } })
  })
  it('ignores non-https URLs', () => {
    cfg.MINI_APP_URL = 'http://app.test'
    expect(appResultsButton(ctx)).toEqual({})
  })
})

import { describe, expect, it, vi } from 'vitest'
import { setupMenuButton } from './menu-button'

describe('setupMenuButton', () => {
  it('skips silently without a URL or with a non-https one', async () => {
    const api = { setChatMenuButton: vi.fn() }
    expect(await setupMenuButton(api, undefined)).toBe(false)
    expect(await setupMenuButton(api, 'http://x.test')).toBe(false)
    expect(api.setChatMenuButton).not.toHaveBeenCalled()
  })

  it('sets a web_app default menu button', async () => {
    const api = { setChatMenuButton: vi.fn(async () => true as const) }
    expect(await setupMenuButton(api, 'https://app.test')).toBe(true)
    expect(api.setChatMenuButton).toHaveBeenCalledWith({
      menu_button: { type: 'web_app', text: 'Quotes', web_app: { url: 'https://app.test' } },
    })
  })

  it('swallows API failures', async () => {
    const api = { setChatMenuButton: vi.fn(async () => { throw new Error('boom') }) }
    expect(await setupMenuButton(api, 'https://app.test')).toBe(false)
  })
})

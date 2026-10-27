import { describe, expect, it } from 'vitest'
import { redactDeep, redactSecrets } from './redact'

const TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw_x'

describe('redactSecrets', () => {
  it('strips a bot token out of a Bot API URL', () => {
    const out = redactSecrets(`fetch failed: https://api.telegram.org/bot${TOKEN}/getFile`)
    expect(out).not.toContain(TOKEN)
    expect(out).toContain('bot<redacted>/getFile')
  })

  it('leaves ordinary text alone', () => {
    expect(redactSecrets('chat 123456:short')).toBe('chat 123456:short')
  })
})

describe('redactDeep', () => {
  it('redacts Error message, stack and nested fields', () => {
    const err = new Error(`boom ${TOKEN}`, { cause: new Error(`inner ${TOKEN}`) })
    const json = JSON.stringify(redactDeep({ err, url: `/file/bot${TOKEN}/x` }))
    expect(json).not.toContain(TOKEN)
    expect(json).toContain('<redacted>')
  })
})

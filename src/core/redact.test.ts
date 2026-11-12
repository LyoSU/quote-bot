import { stdSerializers } from 'pino'
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

  it('keeps a fetch timeout (DOMException) serializable by the logger', async () => {
    const err = await fetch('http://127.0.0.1:9', { signal: AbortSignal.timeout(1) }).catch((e: unknown) => e)
    const timeout = new DOMException(`timed out ${TOKEN}`, 'TimeoutError')
    for (const e of [err, timeout]) {
      const out = stdSerializers.err(redactDeep(e) as Error)
      expect(JSON.stringify(out)).not.toContain(TOKEN)
    }
    expect(stdSerializers.err(redactDeep(timeout) as Error)).toMatchObject({ name: 'TimeoutError', message: 'timed out <redacted>' })
  })
})

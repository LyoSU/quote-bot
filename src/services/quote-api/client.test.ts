import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateQuote, QuoteApiError, QuoteApiUnavailableError } from './client'
import { config } from '../../config/env'
import type { QuoteGenerationRequest } from './types'

const request: QuoteGenerationRequest = { type: 'quote', messages: [{ text: 'hi' }] }

function mockFetch(impl: () => Promise<Response>): void {
  vi.stubGlobal('fetch', vi.fn(impl))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateQuote', () => {
  it('returns image bytes and metadata on success', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    mockFetch(async () =>
      new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'image/webp', 'quote-type': 'quote', 'quote-width': '512', 'quote-height': '320' },
      }),
    )

    const result = await generateQuote(request)
    expect(Buffer.isBuffer(result.image)).toBe(true)
    expect([...result.image]).toEqual([1, 2, 3])
    expect(result.quoteType).toBe('quote')
    expect(result.width).toBe(512)
    expect(result.height).toBe(320)
  })

  it('sends the bot token and API root so the renderer never falls back to the cloud', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(new Uint8Array([1]), {
        status: 200,
        headers: { 'content-type': 'image/webp', 'quote-type': 'quote', 'quote-width': '1', 'quote-height': '1' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await generateQuote(request)

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }]
    const body = JSON.parse(init.body) as Record<string, unknown>
    expect(body['botToken']).toBe(config.BOT_TOKEN)
    expect(body['apiRoot']).toBe(config.BOT_API_ROOT)
  })

  it('throws QuoteApiError with the parsed message on a 400', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ ok: false, error: { code: 400, message: 'messages_empty' } }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(generateQuote(request)).rejects.toMatchObject({
      name: 'QuoteApiError',
      message: 'messages_empty',
      status: 400,
    })
  })

  it('falls back to raw text when the error body is not JSON', async () => {
    mockFetch(async () => new Response('upstream boom', { status: 502 }))
    await expect(generateQuote(request)).rejects.toBeInstanceOf(QuoteApiError)
  })

  it('throws QuoteApiUnavailableError on a network failure', async () => {
    mockFetch(async () => {
      throw new Error('ECONNREFUSED')
    })
    await expect(generateQuote(request)).rejects.toBeInstanceOf(QuoteApiUnavailableError)
  })
})

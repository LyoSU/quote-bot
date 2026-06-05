import { describe, expect, it, vi } from 'vitest'
import { BotApiService } from './service'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function service(fetchFn: typeof fetch, root = 'https://tg-api.example.com'): BotApiService {
  return new BotApiService({ root, token: '42:TEST', fetchFn })
}

describe('BotApiService.getMessages', () => {
  it('POSTs to the custom method and returns the result', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse({ ok: true, result: [{ message_id: 10, date: 0, text: 'hi' }] }),
    )
    const out = await service(fetchFn).getMessages(-100500, [10, 11])
    expect(out).toEqual([{ message_id: 10, date: 0, text: 'hi' }])
    const [url, init] = fetchFn.mock.calls[0]!
    expect(String(url)).toBe('https://tg-api.example.com/bot42:TEST/getMessages')
    expect(JSON.parse(String(init?.body))).toEqual({ chat_id: -100500, message_ids: [10, 11] })
  })

  it('returns [] on an API error instead of throwing', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse({ ok: false, error_code: 400, description: 'Bad Request: messages to get not found' }),
    )
    await expect(service(fetchFn).getMessages(1, [1])).resolves.toEqual([])
  })

  it('degrades to [] against the Telegram cloud without calling it', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const svc = service(fetchFn, 'https://api.telegram.org')
    await expect(svc.getMessages(1, [1])).resolves.toEqual([])
    expect(svc.isHealthy()).toBe(false)
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

describe('BotApiService.getUserEmojiStatus', () => {
  it('returns the status and caches the lookup', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse({ ok: true, result: { id: 1, first_name: 'A', emoji_status_custom_emoji_id: '52313' } }),
    )
    const svc = service(fetchFn)
    await expect(svc.getUserEmojiStatus(1)).resolves.toBe('52313')
    await expect(svc.getUserEmojiStatus(1)).resolves.toBe('52313')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('caches "no status" too', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse({ ok: true, result: { id: 2, first_name: 'B' } }))
    const svc = service(fetchFn)
    await expect(svc.getUserEmojiStatus(2)).resolves.toBeUndefined()
    await expect(svc.getUserEmojiStatus(2)).resolves.toBeUndefined()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('returns undefined when the call fails', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse({ ok: false, error_code: 404, description: 'Not Found' }))
    await expect(service(fetchFn).getUserEmojiStatus(1)).resolves.toBeUndefined()
  })
})

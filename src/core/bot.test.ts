import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from 'grammy'
import { createBot } from './bot'
import { requestShutdown } from './shutdown'

// poll-guard escalates through requestShutdown — keep the test process alive.
vi.mock('./shutdown', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./shutdown')>()),
  requestShutdown: vi.fn(),
}))

/**
 * Integration tests for the OUTGOING TRANSFORMER CHAIN — the wiring in
 * createBot that every unit test trusts blindly:
 *
 *   autoRetry(rethrowHttpErrors) → networkRetry → throttler → pollGuard → pollWatch → fetch
 *
 * A reorder, or dropping `rethrowHttpErrors: true`, silently restores the
 * unbounded-silent-retry behavior these tests exist to forbid.
 */
describe('createBot transformer chain', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('bounds network-error retries and rethrows — auto-retry must not swallow them', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('fetch failed')))
    const bot = createBot({ fetchFn: fetchMock as unknown as typeof fetch })

    const outcome = bot.api.raw.getUpdates({}).then(
      () => 'resolved',
      (err: unknown) => err,
    )
    // networkRetry budget is 1+2+4+8+8 = 23s; give it room and nothing more.
    await vi.advanceTimersByTimeAsync(60_000)

    expect(await outcome).toBeInstanceOf(HttpError)
    // initial call + 5 capped retries; one more means auto-retry looped on it.
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('escalates a persistent "Logged out" poll to a fatal shutdown', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error_code: 400, description: 'Logged out' }), {
        headers: { 'content-type': 'application/json' },
      }),
    )
    const bot = createBot({ fetchFn: fetchMock as unknown as typeof fetch })

    for (let i = 0; i < 3; i++) {
      await bot.api.raw.getUpdates({}).catch(() => {})
    }

    expect(requestShutdown).toHaveBeenCalledTimes(1)
    expect(requestShutdown).toHaveBeenCalledWith('logged-out', 1)
  })
})

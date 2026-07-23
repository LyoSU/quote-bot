import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError, type Transformer } from 'grammy'
import { networkRetry } from './network-retry'

/** Successful Bot API payload, as `prev` would resolve it. */
const OK = { ok: true as const, result: true }

/** grammY types the signal via its abort-controller shim — boundary cast. */
type ApiSignal = NonNullable<Parameters<Transformer>[3]>

function httpError(message = 'fetch failed'): HttpError {
  return new HttpError(message, new Error('ECONNREFUSED'))
}

function signal(controller = new AbortController()): ApiSignal {
  return controller.signal as unknown as ApiSignal
}

describe('networkRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes a successful call through untouched', async () => {
    const prev = vi.fn().mockResolvedValue(OK)
    const call = networkRetry()

    const result = await call(prev, 'getUpdates', {}, signal())

    expect(result).toBe(OK)
    expect(prev).toHaveBeenCalledTimes(1)
  })

  it('retries an HttpError with exponential backoff and recovers', async () => {
    const prev = vi
      .fn()
      .mockRejectedValueOnce(httpError())
      .mockRejectedValueOnce(httpError())
      .mockResolvedValue(OK)
    const call = networkRetry({ attempts: 5, maxDelayMs: 8_000 })

    const promise = call(prev, 'getUpdates', {}, signal())
    await vi.advanceTimersByTimeAsync(1_000) // 1st retry
    await vi.advanceTimersByTimeAsync(2_000) // 2nd retry

    await expect(promise).resolves.toBe(OK)
    expect(prev).toHaveBeenCalledTimes(3)
  })

  it('caps the backoff delay at maxDelayMs', async () => {
    const prev = vi.fn().mockRejectedValue(httpError())
    const call = networkRetry({ attempts: 4, maxDelayMs: 4_000 })

    const promise = call(prev, 'getUpdates', {}, signal())
    promise.catch(() => {}) // inspected via expect below; silence early rejection
    // Delays: 1s, 2s, 4s (capped), 4s (capped) → 11s total for 4 retries.
    await vi.advanceTimersByTimeAsync(11_000)

    await expect(promise).rejects.toBeInstanceOf(HttpError)
    expect(prev).toHaveBeenCalledTimes(5) // initial + 4 retries
  })

  it('rethrows the last HttpError once attempts are exhausted', async () => {
    const prev = vi.fn().mockRejectedValue(httpError('still down'))
    const call = networkRetry({ attempts: 2, maxDelayMs: 8_000 })

    const promise = call(prev, 'getUpdates', {}, signal())
    promise.catch(() => {})
    await vi.advanceTimersByTimeAsync(3_000) // 1s + 2s

    await expect(promise).rejects.toThrow('still down')
    expect(prev).toHaveBeenCalledTimes(3)
  })

  it('does not retry non-network errors', async () => {
    const prev = vi.fn().mockRejectedValue(new Error('boom'))
    const call = networkRetry()

    await expect(call(prev, 'getUpdates', {}, signal())).rejects.toThrow('boom')
    expect(prev).toHaveBeenCalledTimes(1)
  })

  it('stops retrying when the signal aborts mid-wait', async () => {
    const prev = vi.fn().mockRejectedValue(httpError())
    const controller = new AbortController()
    const call = networkRetry({ attempts: 5, maxDelayMs: 8_000 })

    const promise = call(prev, 'getUpdates', {}, signal(controller))
    promise.catch(() => {})
    await vi.advanceTimersByTimeAsync(500) // inside the first 1s wait
    controller.abort()
    await vi.advanceTimersByTimeAsync(10_000)

    await expect(promise).rejects.toBeInstanceOf(HttpError)
    expect(prev).toHaveBeenCalledTimes(1) // no retry after abort
  })
})

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { PollGuard } from './poll-guard'

const LOGGED_OUT = { ok: false as const, error_code: 400, description: 'Logged out' }
const OK = { ok: true as const, result: [] }

describe('PollGuard', () => {
  let onFatal: Mock<(description: string) => void>
  let guard: PollGuard

  beforeEach(() => {
    onFatal = vi.fn()
    guard = new PollGuard(3, onFatal)
  })

  async function poll(result: object): Promise<void> {
    await guard.transformer()(vi.fn().mockResolvedValue(result), 'getUpdates', {}, undefined)
  }

  it('fires onFatal after the threshold of consecutive logged-out polls', async () => {
    await poll(LOGGED_OUT)
    await poll(LOGGED_OUT)
    expect(onFatal).not.toHaveBeenCalled()

    await poll(LOGGED_OUT)
    expect(onFatal).toHaveBeenCalledTimes(1)
    expect(onFatal).toHaveBeenCalledWith('Logged out')
  })

  it('a successful poll resets the strike count', async () => {
    await poll(LOGGED_OUT)
    await poll(LOGGED_OUT)
    await poll(OK)
    await poll(LOGGED_OUT)
    await poll(LOGGED_OUT)

    expect(onFatal).not.toHaveBeenCalled()
  })

  it('ignores other errors and other methods', async () => {
    await poll({ ok: false, error_code: 500, description: 'Internal Server Error' })
    await poll({ ok: false, error_code: 500, description: 'Internal Server Error' })
    await poll({ ok: false, error_code: 500, description: 'Internal Server Error' })

    const sendMessage = vi.fn().mockResolvedValue(LOGGED_OUT)
    for (let i = 0; i < 3; i++) {
      await guard.transformer()(sendMessage, 'sendMessage', { chat_id: 1, text: 'hi' }, undefined)
    }

    expect(onFatal).not.toHaveBeenCalled()
  })

  it('passes results through untouched', async () => {
    const prev = vi.fn().mockResolvedValue(OK)
    const result = await guard.transformer()(prev, 'getUpdates', {}, undefined)
    expect(result).toBe(OK)
  })

  it('fires onFatal only once', async () => {
    for (let i = 0; i < 5; i++) await poll(LOGGED_OUT)
    expect(onFatal).toHaveBeenCalledTimes(1)
  })
})

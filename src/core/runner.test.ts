import { describe, expect, it, vi } from 'vitest'
import type { Update } from 'grammy/types'

const warn = vi.hoisted(() => vi.fn())
vi.mock('./logger', () => ({
  logger: { child: () => ({ warn, info: vi.fn(), debug: vi.fn(), error: vi.fn() }) },
}))

import { onSinkTimeout } from './runner'

const update = { update_id: 7, message: { chat: { id: -42 } } } as unknown as Update

/**
 * After a sink timeout the runner rethrows the task's eventual failure on the
 * promise handed to the timeout handler — NOT into the bot's error boundary.
 * If the handler doesn't consume it, it becomes an unhandledRejection, which
 * shutdown.ts escalates to a fatal process exit. This test pins the contract.
 */
describe('onSinkTimeout', () => {
  it('logs the timeout and consumes the eventual failure of the task', async () => {
    warn.mockClear()
    onSinkTimeout(update, Promise.reject(new Error('failed long after timing out')))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]?.[0]).toMatchObject({ updateId: 7, chatId: -42 })
    expect(warn.mock.calls[1]?.[0]).toMatchObject({
      updateId: 7,
      err: expect.objectContaining({ message: 'failed long after timing out' }),
    })
  })

  it('logs only the timeout line when the task eventually succeeds', async () => {
    warn.mockClear()
    onSinkTimeout(update, Promise.resolve())
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(warn).toHaveBeenCalledTimes(1)
  })
})

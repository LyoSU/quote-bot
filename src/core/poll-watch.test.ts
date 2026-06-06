import { describe, expect, it, vi } from 'vitest'
import { PollWatch } from './poll-watch'

const T0 = 1_000_000

describe('PollWatch', () => {
  it('is fresh right after construction (startup grace)', () => {
    const watch = new PollWatch(90_000, T0)
    expect(watch.isFresh(T0 + 89_999)).toBe(true)
  })

  it('goes stale once maxAgeMs passes without a successful poll', () => {
    const watch = new PollWatch(90_000, T0)
    expect(watch.isFresh(T0 + 90_001)).toBe(false)
  })

  it('markOk refreshes the window', () => {
    const watch = new PollWatch(90_000, T0)
    watch.markOk(T0 + 60_000)
    expect(watch.isFresh(T0 + 120_000)).toBe(true)
  })

  describe('transformer', () => {
    it('marks freshness on a successful getUpdates', async () => {
      const watch = new PollWatch(90_000, T0)
      const markOk = vi.spyOn(watch, 'markOk')
      const prev = vi.fn().mockResolvedValue({ ok: true, result: [] })

      await watch.transformer()(prev, 'getUpdates', {}, undefined)

      expect(markOk).toHaveBeenCalledTimes(1)
    })

    it('ignores other methods and failed responses', async () => {
      const watch = new PollWatch(90_000, T0)
      const markOk = vi.spyOn(watch, 'markOk')
      const t = watch.transformer()

      await t(
        vi.fn().mockResolvedValue({ ok: true, result: true }),
        'sendMessage',
        { chat_id: 1, text: 'hi' },
        undefined,
      )
      await t(
        vi.fn().mockResolvedValue({ ok: false, error_code: 500, description: 'boom' }),
        'getUpdates',
        {},
        undefined,
      )

      expect(markOk).not.toHaveBeenCalled()
    })

    it('lets errors propagate untouched', async () => {
      const watch = new PollWatch(90_000, T0)
      const prev = vi.fn().mockRejectedValue(new Error('down'))

      await expect(watch.transformer()(prev, 'getUpdates', {}, undefined)).rejects.toThrow('down')
    })
  })
})

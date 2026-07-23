import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DRY_LOG_INTERVAL_MS, PollWatch, stallInfo, type RunnerProbe } from './poll-watch'

const log = vi.hoisted(() => ({
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
}))
vi.mock('./logger', () => ({ logger: { child: () => log } }))

const T0 = 1_000_000
const DRY = DRY_LOG_INTERVAL_MS

describe('PollWatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is fresh right after construction (startup grace)', () => {
    const watch = new PollWatch(90_000, T0)
    expect(watch.isFresh(T0 + 89_999)).toBe(true)
  })

  it('goes stale once maxAgeMs passes without a successful poll', () => {
    const watch = new PollWatch(90_000, T0)
    expect(watch.isFresh(T0 + 90_001)).toBe(false)
  })

  it('reports the age of the last successful poll in seconds', () => {
    const watch = new PollWatch(90_000, T0)
    expect(watch.ageSeconds(T0 + 45_000)).toBe(45)
    watch.markOk(T0 + 60_000)
    expect(watch.ageSeconds(T0 + 61_000)).toBe(1)
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

    it('surfaces an ok:false getUpdates in the log — "Logged out" must not be invisible', async () => {
      const watch = new PollWatch(90_000, T0)
      const prev = vi.fn().mockResolvedValue({ ok: false, error_code: 400, description: 'Logged out' })

      await watch.transformer()(prev, 'getUpdates', {}, undefined)

      expect(log.warn).toHaveBeenCalledWith(
        expect.objectContaining({ code: 400, description: 'Logged out' }),
        expect.any(String),
      )
    })
  })

  describe('observe (dry-spell visibility)', () => {
    it('stays quiet while updates flow or lulls are short', () => {
      const watch = new PollWatch(90_000, T0)

      watch.observe(3, T0 + 30_000)
      watch.observe(0, T0 + 60_000)
      watch.observe(1, T0 + 90_000)

      expect(log.warn).not.toHaveBeenCalled()
      expect(log.info).not.toHaveBeenCalled()
    })

    it('warns once the dry spell reaches the interval, then once per interval', () => {
      const watch = new PollWatch(90_000, T0)
      watch.observe(2, T0)

      for (let t = 30_000; t < DRY; t += 30_000) watch.observe(0, T0 + t)
      expect(log.warn).not.toHaveBeenCalled()

      watch.observe(0, T0 + DRY)
      expect(log.warn).toHaveBeenCalledTimes(1)

      watch.observe(0, T0 + DRY + 30_000)
      expect(log.warn).toHaveBeenCalledTimes(1) // not again until the next interval

      watch.observe(0, T0 + 2 * DRY)
      expect(log.warn).toHaveBeenCalledTimes(2)
    })

    it('closes a dry spell with its duration when updates resume', () => {
      const watch = new PollWatch(90_000, T0)
      watch.observe(2, T0)
      watch.observe(0, T0 + DRY)

      watch.observe(5, T0 + DRY + 120_000)

      expect(log.info).toHaveBeenCalledWith(
        expect.objectContaining({ drySeconds: (DRY + 120_000) / 1000 }),
        expect.any(String),
      )
    })

    it('does not log recovery after a short lull', () => {
      const watch = new PollWatch(90_000, T0)
      watch.observe(1, T0)
      watch.observe(0, T0 + 30_000)

      watch.observe(1, T0 + 60_000)

      expect(log.info).not.toHaveBeenCalled()
    })
  })
})

describe('stallInfo (watchdog predicate)', () => {
  const runner = (running: boolean, size = 0): RunnerProbe => ({
    isRunning: () => running,
    size: () => size,
  })

  it('is null while polling is fresh', () => {
    const watch = new PollWatch(90_000, T0)
    expect(stallInfo(runner(true), watch, T0 + 60_000)).toBeNull()
  })

  it('is null when the runner is not running (normal shutdown, not a stall)', () => {
    const watch = new PollWatch(90_000, T0)
    expect(stallInfo(runner(false), watch, T0 + 300_000)).toBeNull()
  })

  it('reports poll age and in-flight count once polling goes stale', () => {
    const watch = new PollWatch(90_000, T0)
    expect(stallInfo(runner(true, 500), watch, T0 + 200_000)).toEqual({
      ageSeconds: 200,
      inFlight: 500,
    })
  })
})

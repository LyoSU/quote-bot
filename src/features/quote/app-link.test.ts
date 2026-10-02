import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Types } from 'mongoose'

vi.mock('../../db/models', () => ({ Quote: { findOne: vi.fn() } }))
import { Quote } from '../../db/models'
import { isWeeklyTop, resolveQuoteLink } from './app-link'
import type { BotContext } from '../../core/types'

const group = new Types.ObjectId()
const quoteId = new Types.ObjectId()

function chain(result: unknown) {
  const q = { sort: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), lean: vi.fn(async () => result) }
  vi.mocked(Quote.findOne).mockReturnValue(q as never)
  return q
}

beforeEach(() => vi.mocked(Quote.findOne).mockReset())

describe('isWeeklyTop', () => {
  it('skips the query for unrated quotes', async () => {
    expect(await isWeeklyTop({ _id: quoteId, group, rate: { score: 0 } })).toBe(false)
    expect(Quote.findOne).not.toHaveBeenCalled()
  })

  it('queries the last 7 days sorted by score and matches the id', async () => {
    const q = chain({ _id: quoteId })
    const now = Date.UTC(2026, 0, 10)
    expect(await isWeeklyTop({ _id: quoteId, group, rate: { score: 3 } }, now)).toBe(true)
    expect(Quote.findOne).toHaveBeenCalledWith({ group, createdAt: { $gte: new Date(now - 7 * 86_400_000) } })
    expect(q.sort).toHaveBeenCalledWith({ 'rate.score': -1, createdAt: -1 })
  })

  it('is false when another quote leads', async () => {
    chain({ _id: new Types.ObjectId() })
    expect(await isWeeklyTop({ _id: quoteId, group, rate: { score: 3 } })).toBe(false)
  })
})

describe('resolveQuoteLink', () => {
  const ctx = (appButton?: boolean) =>
    ({
      me: { username: 'bot' },
      group: { _id: group, settings: appButton === undefined ? {} : { appButton } },
      t: (k: string) => k,
    }) as unknown as BotContext

  it('returns nothing when the group disabled the app button', async () => {
    expect(await resolveQuoteLink(ctx(false), { _id: quoteId, group, local_id: 5 })).toBeUndefined()
  })

  it('labels with the local id by default and the badge for the weekly top', async () => {
    expect((await resolveQuoteLink(ctx(), { _id: quoteId, group, local_id: 5 }))?.label).toBe('№5 ↗')
    chain({ _id: quoteId })
    const top = await resolveQuoteLink(ctx(), { _id: quoteId, group, local_id: 5, rate: { score: 2 } })
    expect(top?.label).toBe('app-open_top_week')
    expect(top?.url).toContain(`q_5_g_${group}`)
  })
})

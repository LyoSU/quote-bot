import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Types } from 'mongoose'

vi.mock('../../db/models', () => ({ Quote: { findOne: vi.fn(), aggregate: vi.fn(), countDocuments: vi.fn(), find: vi.fn() }, Group: {} }))
import { Quote } from '../../db/models'
import { buildRandomKeyboard, sampleQuote, shouldOfferGame } from './random'
import type { BotContext } from '../../core/types'

const group = new Types.ObjectId()
const quote = { _id: new Types.ObjectId(), local_id: 7, rate: { votes: [] } }
const ctx = (appButton?: boolean) =>
  ({ me: { username: 'bot' }, group: { _id: group, settings: appButton === undefined ? {} : { appButton } }, t: (k: string) => k }) as unknown as BotContext
const lastButton = (kb: { inline_keyboard: { text: string; url?: string }[][] }) => kb.inline_keyboard[0]!.at(-1)!

describe('shouldOfferGame', () => {
  it('fires for roughly 1 in 5 rolls', () => {
    expect(shouldOfferGame(() => 0)).toBe(true)
    expect(shouldOfferGame(() => 0.199)).toBe(true)
    expect(shouldOfferGame(() => 0.2)).toBe(false)
    expect(shouldOfferGame(() => 0.99)).toBe(false)
  })
})

describe('buildRandomKeyboard', () => {
  it('swaps the link for the game on a winning roll', async () => {
    const btn = lastButton(await buildRandomKeyboard(ctx(), quote, { offerGame: true, rng: () => 0.05 }))
    expect(btn.text).toBe('app-open_game')
    expect(btn.url).toContain(`startapp=game_${group}`)
  })

  it('keeps the quote link on a losing roll', async () => {
    const btn = lastButton(await buildRandomKeyboard(ctx(), quote, { offerGame: true, rng: () => 0.9 }))
    expect(btn.text).toBe('№7 ↗')
  })

  it('never offers the game unless asked (auto-gab)', async () => {
    const btn = lastButton(await buildRandomKeyboard(ctx(), quote, { rng: () => 0 }))
    expect(btn.text).toBe('№7 ↗')
  })

  it('adds no app button when the group disabled it', async () => {
    const kb = await buildRandomKeyboard(ctx(false), quote, { offerGame: true, rng: () => 0 })
    expect(kb.inline_keyboard[0]).toHaveLength(2)
  })
})

describe('sampleQuote — the full pool', () => {
  /** `find().sort().skip().limit().lean()`, answering `docs` and recording the skip. */
  const findReturning = (docs: unknown[]) => {
    const chain = { sort: vi.fn(), skip: vi.fn(), limit: vi.fn(), lean: vi.fn(async () => docs) }
    chain.sort.mockReturnValue(chain)
    chain.skip.mockReturnValue(chain)
    chain.limit.mockReturnValue(chain)
    return chain
  }
  const count = vi.mocked(Quote.countDocuments)
  const find = vi.mocked(Quote.find)
  beforeEach(() => vi.clearAllMocks())

  it('reaches every position 0…n-1 with equal width of the roll — each quote 1/n', async () => {
    const skips: number[] = []
    for (const roll of [0, 0.249, 0.25, 0.5, 0.75, 0.999]) {
      count.mockResolvedValueOnce(4 as never)
      const chain = findReturning([quote])
      find.mockReturnValueOnce(chain as never)
      await sampleQuote(group, [], () => roll)
      skips.push(chain.skip.mock.calls[0]![0] as number)
    }
    expect(skips).toEqual([0, 0, 1, 2, 3, 3])
  })

  it('walks the { group, rate.score } index: rated quotes of this group, in index order, one document', async () => {
    count.mockResolvedValueOnce(10 as never)
    const chain = findReturning([quote])
    find.mockReturnValueOnce(chain as never)
    expect(await sampleQuote(group, [], () => 0.3)).toBe(quote)
    const filter = { group, 'rate.score': { $gt: 0 } }
    expect(count).toHaveBeenCalledWith(filter)
    expect(find).toHaveBeenCalledWith(filter)
    expect(chain.sort).toHaveBeenCalledWith({ 'rate.score': -1 })
    expect(chain.limit).toHaveBeenCalledWith(1)
    expect(Quote.aggregate).not.toHaveBeenCalled()
  })

  it('answers nothing for a group with no rated quotes, without a pick', async () => {
    count.mockResolvedValueOnce(0 as never)
    expect(await sampleQuote(group, [], () => 0.5)).toBeUndefined()
    expect(find).not.toHaveBeenCalled()
  })

  it('counts again when the pool shrank between the count and the pick', async () => {
    count.mockResolvedValueOnce(5 as never).mockResolvedValueOnce(4 as never)
    find.mockReturnValueOnce(findReturning([]) as never).mockReturnValueOnce(findReturning([quote]) as never)
    expect(await sampleQuote(group, [], () => 0.99)).toBe(quote)
    expect(count).toHaveBeenCalledTimes(2)
  })
})

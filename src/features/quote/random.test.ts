import { describe, expect, it, vi } from 'vitest'
import { Types } from 'mongoose'

vi.mock('../../db/models', () => ({ Quote: { findOne: vi.fn(), aggregate: vi.fn() }, Group: {} }))
import { buildRandomKeyboard, shouldOfferGame } from './random'
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

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User as TelegramUser } from 'grammy/types'
import { getOrCreateUser } from './user-repository'
import { User } from '../models/user'

vi.mock('../models/user', () => ({
  User: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}))

/** Mongoose query stub: `.lean()` resolves to the given value. */
function lean<T>(value: T): { lean: () => Promise<T> } {
  return { lean: () => Promise.resolve(value) }
}

const FROM: TelegramUser = { id: 42, is_bot: false, first_name: 'Ann', username: 'ann' }

describe('getOrCreateUser', () => {
  beforeEach(() => {
    vi.mocked(User.findOne).mockReset()
    vi.mocked(User.findOneAndUpdate).mockReset()
    vi.mocked(User.updateOne).mockReset()
  })

  it('returns the existing user without any write', async () => {
    const existing = { _id: 'u1', telegram_id: 42, first_name: 'Ann', full_name: 'Ann', username: 'ann' }
    vi.mocked(User.findOne).mockReturnValue(lean(existing) as never)

    const user = await getOrCreateUser(FROM, false)

    expect(user).toBe(existing)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('creates a missing user atomically — upsert keyed by telegram_id, fields in $setOnInsert', async () => {
    const created = { _id: 'u1', telegram_id: 42 }
    vi.mocked(User.findOne).mockReturnValue(lean(null) as never)
    vi.mocked(User.findOneAndUpdate).mockReturnValue(lean(created) as never)

    const user = await getOrCreateUser(FROM, true)

    expect(user).toBe(created)
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { telegram_id: 42 },
      {
        $setOnInsert: expect.objectContaining({
          telegram_id: 42,
          first_name: 'Ann',
          full_name: 'Ann',
          username: 'ann',
          status: 'member',
        }),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  })

  it('survives an upsert duplicate-key race by re-reading the winner', async () => {
    // Mongo < 4.2 can still surface E11000 when two upserts race; the doc is
    // guaranteed to exist afterwards, so a single re-read resolves it.
    const winner = { _id: 'u1', telegram_id: 42 }
    vi.mocked(User.findOne)
      .mockReturnValueOnce(lean(null) as never)
      .mockReturnValueOnce(lean(winner) as never)
    vi.mocked(User.findOneAndUpdate).mockReturnValue({
      lean: () => Promise.reject(Object.assign(new Error('E11000 duplicate key'), { code: 11000 })),
    } as never)

    const user = await getOrCreateUser(FROM, false)

    expect(user).toBe(winner)
    expect(User.findOne).toHaveBeenCalledTimes(2)
  })

  it('does not mark group-only users as members', async () => {
    vi.mocked(User.findOne).mockReturnValue(lean(null) as never)
    vi.mocked(User.findOneAndUpdate).mockReturnValue(lean({ _id: 'u1', telegram_id: 42 }) as never)

    await getOrCreateUser(FROM, false)

    const update = vi.mocked(User.findOneAndUpdate).mock.calls[0]?.[1] as { $setOnInsert: object }
    expect('status' in update.$setOnInsert).toBe(false)
  })
})

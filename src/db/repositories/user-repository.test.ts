import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User as TelegramUser } from 'grammy/types'
import type { Types } from 'mongoose'
import type { UserDoc } from '../models/user'

const { findOne, findOneAndUpdate, updateOne } = vi.hoisted(() => ({
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn(),
}))
vi.mock('../models/user', () => ({ User: { findOne, findOneAndUpdate, updateOne } }))

/** Mongoose query stub: `.lean()` resolves to the given value. */
function lean<T>(value: T): { lean: () => Promise<T> } {
  return { lean: () => Promise.resolve(value) }
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const FROM: TelegramUser = { id: 42, is_bot: false, first_name: 'Ann', username: 'ann' }

function makeDoc(): UserDoc {
  return {
    _id: 'u1' as unknown as Types.ObjectId,
    telegram_id: 42,
    first_name: 'Ann',
    full_name: 'Ann',
    username: 'ann',
  } as unknown as UserDoc
}

// The lookup cache is module-level state — a fresh import per test isolates it.
async function loadRepo(): Promise<typeof import('./user-repository.js')> {
  return import('./user-repository.js')
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('getOrCreateUser', () => {
  it('returns the existing user without any write', async () => {
    const repo = await loadRepo()
    const existing = makeDoc()
    findOne.mockReturnValue(lean(existing))

    const user = await repo.getOrCreateUser(FROM, false)

    expect(user).toBe(existing)
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('creates a missing user atomically — upsert keyed by telegram_id, fields in $setOnInsert', async () => {
    const repo = await loadRepo()
    const created = { _id: 'u1', telegram_id: 42 }
    findOne.mockReturnValue(lean(null))
    findOneAndUpdate.mockReturnValue(lean(created))

    const user = await repo.getOrCreateUser(FROM, true)

    expect(user).toBe(created)
    expect(findOneAndUpdate).toHaveBeenCalledWith(
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
    const repo = await loadRepo()
    const winner = { _id: 'u1', telegram_id: 42 }
    findOne.mockReturnValueOnce(lean(null)).mockReturnValueOnce(lean(winner))
    findOneAndUpdate.mockReturnValue({
      lean: () => Promise.reject(Object.assign(new Error('E11000 duplicate key'), { code: 11000 })),
    })

    const user = await repo.getOrCreateUser(FROM, false)

    expect(user).toBe(winner)
    expect(findOne).toHaveBeenCalledTimes(2)
  })

  it('does not mark group-only users as members', async () => {
    const repo = await loadRepo()
    findOne.mockReturnValue(lean(null))
    findOneAndUpdate.mockReturnValue(lean({ _id: 'u1', telegram_id: 42 }))

    await repo.getOrCreateUser(FROM, false)

    const update = findOneAndUpdate.mock.calls[0]?.[1] as { $setOnInsert: object }
    expect('status' in update.$setOnInsert).toBe(false)
  })
})

describe('user lookup cache', () => {
  it('serves repeat lookups from memory — one DB read', async () => {
    const repo = await loadRepo()
    findOne.mockReturnValue(lean(makeDoc()))

    const first = await repo.getOrCreateUser(FROM, false)
    const second = await repo.getOrCreateUser(FROM, false)

    expect(findOne).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('caches a newly created user from the upsert path', async () => {
    const repo = await loadRepo()
    findOne.mockReturnValueOnce(lean(null))
    findOneAndUpdate.mockReturnValue(lean(makeDoc()))

    await repo.getOrCreateUser(FROM, true)
    await repo.getOrCreateUser(FROM, true)

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1)
    expect(findOne).toHaveBeenCalledTimes(1)
  })

  it('invalidates on a settings write — the next lookup re-reads', async () => {
    const repo = await loadRepo()
    findOne.mockReturnValue(lean(makeDoc()))
    updateOne.mockResolvedValue({})

    const user = await repo.getOrCreateUser(FROM, false)
    await repo.updateUserSettings(user, { 'settings.locale': 'uk' })
    await repo.getOrCreateUser(FROM, false)

    expect(updateOne).toHaveBeenCalledTimes(1)
    expect(findOne).toHaveBeenCalledTimes(2)
  })

  it('does not write while the profile is unchanged', async () => {
    const repo = await loadRepo()
    findOne.mockReturnValue(lean(makeDoc()))

    await repo.getOrCreateUser(FROM, false)
    await repo.getOrCreateUser(FROM, false)
    await tick()

    expect(updateOne).not.toHaveBeenCalled()
  })

  it('writes a changed profile through and patches the cached copy in place', async () => {
    const repo = await loadRepo()
    findOne.mockReturnValue(lean(makeDoc()))
    updateOne.mockResolvedValue({})

    await repo.getOrCreateUser(FROM, false)
    const renamed = await repo.getOrCreateUser({ ...FROM, first_name: 'Anna' }, false)
    await tick() // profile sync is fire-and-forget

    expect(updateOne).toHaveBeenCalledTimes(1)
    expect(findOne).toHaveBeenCalledTimes(1) // still cached, no refetch
    expect(renamed.first_name).toBe('Anna')
    expect(renamed.full_name).toBe('Anna')
  })
})

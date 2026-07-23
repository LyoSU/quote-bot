import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Chat } from 'grammy/types'
import type { Types } from 'mongoose'
import type { GroupDoc } from '../models/group'

const { findOneAndUpdate, updateOne } = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn(),
}))
vi.mock('../models/group', () => ({ Group: { findOneAndUpdate, updateOne } }))

const lean = <T>(value: T): { lean: () => Promise<T> } => ({ lean: () => Promise.resolve(value) })
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const chat: Chat.SupergroupChat = { id: -100, type: 'supergroup', title: 'Lair' }

function makeDoc(): GroupDoc {
  return {
    _id: 'oid-100' as unknown as Types.ObjectId,
    group_id: -100,
    title: 'Lair',
  } as unknown as GroupDoc
}

// The cache is module-level state — a fresh import per test isolates it.
async function loadRepo(): Promise<typeof import('./group-repository.js')> {
  return import('./group-repository.js')
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('group repository cache', () => {
  it('serves repeat lookups from memory — one DB roundtrip', async () => {
    const repo = await loadRepo()
    findOneAndUpdate.mockReturnValue(lean(makeDoc()))

    const first = await repo.getOrCreateGroup(chat)
    const second = await repo.getOrCreateGroup(chat)

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('does not write while title/username are unchanged (write-on-change)', async () => {
    const repo = await loadRepo()
    findOneAndUpdate.mockReturnValue(lean(makeDoc()))

    await repo.getOrCreateGroup(chat)
    await repo.getOrCreateGroup(chat)
    await tick()

    expect(updateOne).not.toHaveBeenCalled()
  })

  it('writes a renamed group through and patches the cached copy in place', async () => {
    const repo = await loadRepo()
    findOneAndUpdate.mockReturnValue(lean(makeDoc()))
    updateOne.mockResolvedValue({})

    await repo.getOrCreateGroup(chat)
    await repo.getOrCreateGroup({ ...chat, title: 'New Lair' })
    await tick() // profile sync is fire-and-forget

    expect(updateOne).toHaveBeenCalledTimes(1)
    expect(findOneAndUpdate).toHaveBeenCalledTimes(1) // still cached

    const third = await repo.getOrCreateGroup({ ...chat, title: 'New Lair' })
    await tick()
    expect(third.title).toBe('New Lair')
    expect(updateOne).toHaveBeenCalledTimes(1) // patched copy — no re-write
  })

  it('invalidates on a settings write — the next lookup re-reads', async () => {
    const repo = await loadRepo()
    findOneAndUpdate.mockReturnValue(lean(makeDoc()))
    updateOne.mockResolvedValue({})

    const group = await repo.getOrCreateGroup(chat)
    await repo.updateGroupSettings(group, { 'settings.rate': true })
    await repo.getOrCreateGroup(chat)

    expect(findOneAndUpdate).toHaveBeenCalledTimes(2)
  })

  it('invalidates when the sticker set changes', async () => {
    const repo = await loadRepo()
    findOneAndUpdate.mockReturnValue(lean(makeDoc()))
    updateOne.mockResolvedValue({})

    const group = await repo.getOrCreateGroup(chat)
    await repo.setGroupStickerSet(group, 'pack_by_bot')
    await repo.getOrCreateGroup(chat)

    expect(findOneAndUpdate).toHaveBeenCalledTimes(2)
  })
})

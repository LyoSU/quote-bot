import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'

// Mock the model so no real Mongo connection is opened during the test.
const { updateOne } = vi.hoisted(() => ({
  updateOne: vi.fn((..._args: unknown[]) => Promise.resolve()),
}))
vi.mock('./models/group-member', () => ({ GroupMember: { updateOne } }))

import { trackMember } from './member-tracker'

beforeEach(() => {
  updateOne.mockClear()
})

describe('trackMember', () => {
  it('upserts a (group, user) pair once and dedups repeats', () => {
    const group = new Types.ObjectId()
    trackMember(group, 111)
    trackMember(group, 111)
    trackMember(group, 111)
    expect(updateOne).toHaveBeenCalledTimes(1)
  })

  it('tracks distinct users and groups separately', () => {
    const groupA = new Types.ObjectId()
    const groupB = new Types.ObjectId()
    trackMember(groupA, 1)
    trackMember(groupA, 2)
    trackMember(groupB, 1)
    expect(updateOne).toHaveBeenCalledTimes(3)
  })
})

import { describe, it, expect } from 'vitest'
import { Types } from 'mongoose'
import { applyVote, ensureVotes } from './rate'

const votes = () => [
  { name: '👍', vote: [] as (Types.ObjectId | string)[] },
  { name: '👎', vote: [] as (Types.ObjectId | string)[] },
]

describe('applyVote', () => {
  it('records a new vote', () => {
    const v = votes()
    const id = new Types.ObjectId()
    expect(applyVote(v, id, '👍')).toBe('rated')
    expect(v[0]!.vote).toHaveLength(1)
  })

  it('toggles the same vote off', () => {
    const v = votes()
    const id = new Types.ObjectId()
    applyVote(v, id, '👍')
    expect(applyVote(v, id, '👍')).toBe('back')
    expect(v[0]!.vote).toHaveLength(0)
  })

  it('moves a vote from 👍 to 👎', () => {
    const v = votes()
    const id = new Types.ObjectId()
    applyVote(v, id, '👍')
    expect(applyVote(v, id, '👎')).toBe('rated')
    expect(v[0]!.vote).toHaveLength(0)
    expect(v[1]!.vote).toHaveLength(1)
  })

  it('matches legacy string-stored ids (regression: v.equals is not a function)', () => {
    const id = new Types.ObjectId()
    const v = [
      { name: '👍', vote: [id.toString()] as (Types.ObjectId | string)[] }, // legacy string id
      { name: '👎', vote: [] as (Types.ObjectId | string)[] },
    ]
    // Same user taps 👍 again → should remove their (string) vote, not throw.
    expect(applyVote(v, id, '👍')).toBe('back')
    expect(v[0]!.vote).toHaveLength(0)
  })
})

describe('ensureVotes', () => {
  it('defaults to empty 👍/👎 buckets for a quote without rate data', () => {
    const v = ensureVotes({ rate: undefined })
    expect(v.map((r) => r.name)).toEqual(['👍', '👎'])
  })
})

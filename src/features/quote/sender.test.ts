import { describe, it, expect } from 'vitest'
import { hashCode, syntheticId, isSyntheticId, stubFromName, senderFromChat, resolveMessageOrigin } from './sender'

describe('hashCode', () => {
  it('is deterministic and stable', () => {
    expect(hashCode('Alice')).toBe(hashCode('Alice'))
    expect(hashCode('Alice')).not.toBe(hashCode('Bob'))
    expect(hashCode('')).toBe(0)
  })
})

describe('syntheticId', () => {
  it('is negative, deterministic and outside every real id range', () => {
    const id = syntheticId('Ghost')
    expect(id).toBe(syntheticId('Ghost'))
    expect(id).toBeLessThan(-2_000_000_000_000) // below channel ids (-100… + id)
    expect(isSyntheticId(id)).toBe(true)
    expect(syntheticId('')).toBe(-2_100_000_000_000)
  })

  it('keeps the legacy color index (abs(id) % 7)', () => {
    for (const name of ['Alice', 'Bob', 'Ghost', 'Анонім', 'x']) {
      expect(Math.abs(syntheticId(name)) % 7).toBe(Math.abs(hashCode(name)) % 7)
    }
  })

  it('does not flag real ids', () => {
    for (const id of [1, 66478514, -4_000_000_000, -1_001_234_567_890, -1_997_852_516_352, undefined]) {
      expect(isSyntheticId(id)).toBe(false)
    }
  })
})

describe('stubFromName', () => {
  it('builds a synthetic sender from a name', () => {
    expect(stubFromName('Ghost')).toEqual({ id: syntheticId('Ghost'), name: 'Ghost' })
  })
})

describe('senderFromChat', () => {
  it('maps a chat to a sender', () => {
    expect(senderFromChat({ id: -100, title: 'News', username: 'news' })).toEqual({
      id: -100,
      name: 'News',
      username: 'news',
      photo: undefined,
    })
  })
})

describe('resolveMessageOrigin', () => {
  it('returns null for missing origin', () => {
    expect(resolveMessageOrigin(null)).toBeNull()
    expect(resolveMessageOrigin(undefined)).toBeNull()
  })

  it('resolves a user origin to its sender_user', () => {
    const sender = { id: 1, first_name: 'A' }
    expect(resolveMessageOrigin({ type: 'user', sender_user: sender })).toBe(sender)
  })

  it('synthesizes a stable id for hidden users', () => {
    expect(resolveMessageOrigin({ type: 'hidden_user', sender_user_name: 'Anon' })).toEqual({
      id: syntheticId('Anon'),
      name: 'Anon',
    })
  })

  it('carries author_signature for chat/channel origins', () => {
    expect(
      resolveMessageOrigin({ type: 'channel', chat: { id: -1, title: 'Ch' }, author_signature: 'Editor' }),
    ).toEqual({ id: -1, title: 'Ch', author_signature: 'Editor' })
  })

  it('returns null for an unrecognized origin type', () => {
    expect(resolveMessageOrigin({ type: 'message_import' })).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { hashCode, stubFromName, senderFromChat, resolveMessageOrigin } from './sender'

describe('hashCode', () => {
  it('is deterministic and stable', () => {
    expect(hashCode('Alice')).toBe(hashCode('Alice'))
    expect(hashCode('Alice')).not.toBe(hashCode('Bob'))
    expect(hashCode('')).toBe(0)
  })
})

describe('stubFromName', () => {
  it('builds a synthetic sender from a name', () => {
    expect(stubFromName('Ghost')).toEqual({ id: hashCode('Ghost'), name: 'Ghost' })
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
      id: hashCode('Anon'),
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

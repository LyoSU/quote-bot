import { describe, it, expect } from 'vitest'
import { isRelevantUpdate } from './fast-path'
import type { BotContext } from '../core/types'

const ME = { id: 42, username: 'quotlybot' }

/** Build a minimal context-shaped object for the predicate under test. */
function ctx(partial: Record<string, unknown>): BotContext {
  return { me: ME, ...partial } as unknown as BotContext
}

describe('isRelevantUpdate', () => {
  it('treats any private-chat message as relevant', () => {
    const c = ctx({ chat: { type: 'private' }, message: { text: 'hello' } })
    expect(isRelevantUpdate(c)).toBe(true)
  })

  it('ignores plain group chatter', () => {
    const c = ctx({ chat: { type: 'supergroup' }, message: { text: 'lol nice' } })
    expect(isRelevantUpdate(c)).toBe(false)
  })

  it('ignores group media without a command/mention', () => {
    const c = ctx({ chat: { type: 'group' }, message: { photo: [{}] } })
    expect(isRelevantUpdate(c)).toBe(false)
  })

  it('accepts a command in a group', () => {
    const c = ctx({
      chat: { type: 'supergroup' },
      message: { text: '/q', entities: [{ type: 'bot_command', offset: 0, length: 2 }] },
    })
    expect(isRelevantUpdate(c)).toBe(true)
  })

  it('rejects a command not at offset 0', () => {
    const c = ctx({
      chat: { type: 'supergroup' },
      message: { text: 'see /help', entities: [{ type: 'bot_command', offset: 4, length: 5 }] },
    })
    expect(isRelevantUpdate(c)).toBe(false)
  })

  it('accepts a reply to the bot in a group', () => {
    const c = ctx({
      chat: { type: 'supergroup' },
      message: { text: 'yes', reply_to_message: { from: { id: ME.id } } },
    })
    expect(isRelevantUpdate(c)).toBe(true)
  })

  it('accepts an @mention of the bot in a group', () => {
    const c = ctx({
      chat: { type: 'supergroup' },
      message: { text: 'hey @quotlybot', entities: [{ type: 'mention', offset: 4, length: 10 }] },
    })
    expect(isRelevantUpdate(c)).toBe(true)
  })

  it('accepts a mention typed in a different case than the username', () => {
    const c = ctx({
      me: { id: 42, username: 'QuotLyBot' },
      chat: { type: 'supergroup' },
      message: { text: '@quotlybot', entities: [{ type: 'mention', offset: 0, length: 10 }] },
    })
    expect(isRelevantUpdate(c)).toBe(true)
  })

  it('ignores a mention of a different bot', () => {
    const c = ctx({
      chat: { type: 'supergroup' },
      message: { text: 'hey @otherbot', entities: [{ type: 'mention', offset: 4, length: 9 }] },
    })
    expect(isRelevantUpdate(c)).toBe(false)
  })

  it('accepts callback queries', () => {
    expect(isRelevantUpdate(ctx({ callbackQuery: { id: '1' } }))).toBe(true)
  })

  it('accepts inline queries', () => {
    expect(isRelevantUpdate(ctx({ inlineQuery: { id: '1', query: '' } }))).toBe(true)
  })

  it('accepts guest-mode messages', () => {
    expect(isRelevantUpdate(ctx({ guestMessage: { guest_query_id: 'g1' } }))).toBe(true)
  })

  it('ignores updates with no message we care about', () => {
    expect(isRelevantUpdate(ctx({ chat: { type: 'channel' } }))).toBe(false)
  })
})

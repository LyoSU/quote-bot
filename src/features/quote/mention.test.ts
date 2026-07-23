import { describe, it, expect } from 'vitest'
import { bareMentionArgs } from './mention'
import type { MessageEntity } from 'grammy/types'

const BOT = 'QuotLyBot'

/** Builds the mention entity for `@<username>` found at `offset` in `text`. */
function mentionAt(text: string, username: string): MessageEntity {
  const offset = text.indexOf(`@${username}`)
  return { type: 'mention', offset, length: username.length + 1 }
}

describe('bareMentionArgs', () => {
  it('accepts a bare mention with no flags', () => {
    const text = '@QuotLyBot'
    expect(bareMentionArgs(text, [mentionAt(text, BOT)], BOT)).toBe('')
  })

  it('accepts a mention followed by flags', () => {
    const text = '@QuotLyBot 3 r'
    expect(bareMentionArgs(text, [mentionAt(text, BOT)], BOT)).toBe('3 r')
  })

  it('accepts flags before the mention', () => {
    const text = 'rate @QuotLyBot'
    expect(bareMentionArgs(text, [mentionAt(text, BOT)], BOT)).toBe('rate')
  })

  it('accepts a color token (colors are valid flags)', () => {
    const text = '@QuotLyBot red'
    expect(bareMentionArgs(text, [mentionAt(text, BOT)], BOT)).toBe('red')
  })

  it('matches the username case-insensitively', () => {
    const text = '@quotlybot s2'
    expect(bareMentionArgs(text, [mentionAt(text, 'quotlybot')], BOT)).toBe('s2')
  })

  it('rejects chatter that merely names the bot', () => {
    const text = 'глянь @QuotLyBot класний'
    expect(bareMentionArgs(text, [mentionAt(text, BOT)], BOT)).toBeNull()
  })

  it('rejects a mention of another bot', () => {
    const text = '@OtherBot'
    expect(bareMentionArgs(text, [mentionAt(text, 'OtherBot')], BOT)).toBeNull()
  })

  it('rejects text without entities', () => {
    expect(bareMentionArgs('@QuotLyBot', undefined, BOT)).toBeNull()
  })

  it('rejects when the bot has no username yet', () => {
    const text = '@QuotLyBot'
    expect(bareMentionArgs(text, [mentionAt(text, BOT)], undefined)).toBeNull()
  })

  it('rejects a plain message with no mention at all', () => {
    expect(bareMentionArgs('просто текст', [], BOT)).toBeNull()
  })
})

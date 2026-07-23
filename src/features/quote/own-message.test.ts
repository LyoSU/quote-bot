import { describe, it, expect } from 'vitest'
import { isOwnMessage } from './own-message'

const ME = 123456

describe('isOwnMessage', () => {
  it('flags a reply to a message the bot sent (by sender id)', () => {
    expect(isOwnMessage({ from: { id: ME } }, ME)).toBe(true)
  })

  it('flags a reply carrying guest bot caller attribution (user)', () => {
    expect(isOwnMessage({ from: { id: 999 }, guest_bot_caller_user: { id: 1 } }, ME)).toBe(true)
  })

  it('flags a reply carrying guest bot caller attribution (chat)', () => {
    expect(isOwnMessage({ guest_bot_caller_chat: { id: -100 } }, ME)).toBe(true)
  })

  it('passes a reply from a regular user', () => {
    expect(isOwnMessage({ from: { id: 42 } }, ME)).toBe(false)
  })

  it('passes a reply from another bot', () => {
    expect(isOwnMessage({ from: { id: 777, is_bot: true } }, ME)).toBe(false)
  })

  it('passes a reply with no sender info at all', () => {
    expect(isOwnMessage({}, ME)).toBe(false)
  })
})

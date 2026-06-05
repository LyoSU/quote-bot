import { describe, it, expect } from 'vitest'
import { isOwnGuestMessage } from './guest'

const ME = 123456

describe('isOwnGuestMessage', () => {
  it('flags a reply to a message the bot sent (by sender id)', () => {
    expect(isOwnGuestMessage({ from: { id: ME } }, ME)).toBe(true)
  })

  it('flags a reply carrying guest bot caller attribution (user)', () => {
    expect(isOwnGuestMessage({ from: { id: 999 }, guest_bot_caller_user: { id: 1 } }, ME)).toBe(true)
  })

  it('flags a reply carrying guest bot caller attribution (chat)', () => {
    expect(isOwnGuestMessage({ guest_bot_caller_chat: { id: -100 } }, ME)).toBe(true)
  })

  it('passes a reply from a regular user', () => {
    expect(isOwnGuestMessage({ from: { id: 42 } }, ME)).toBe(false)
  })

  it('passes a reply from another bot', () => {
    expect(isOwnGuestMessage({ from: { id: 777, is_bot: true } }, ME)).toBe(false)
  })

  it('passes a reply with no sender info at all', () => {
    expect(isOwnGuestMessage({}, ME)).toBe(false)
  })
})

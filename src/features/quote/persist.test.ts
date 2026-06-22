import { describe, it, expect } from 'vitest'
import { membershipIds } from './persist'
import type { QuoteMessage } from '../../services/quote-api/types'

const m = (over: Partial<QuoteMessage> = {}): QuoteMessage => ({ from: { id: 1, name: 'A' }, ...over })

describe('membershipIds', () => {
  it('counts the actual senders of the quoted messages', () => {
    expect(membershipIds([m({ from: { id: 10, name: 'A' } })])).toEqual([10])
  })

  it('does NOT count a forward-label origin as a member', () => {
    // Someone forwarded a message into the group: the forwarder (`from`) is the
    // member here; the original author rides on `forward` and need not belong to
    // this group. Crediting them would make later /q forwards mis-attribute.
    const msg = m({
      from: { id: 50, name: 'Forwarder' },
      forward: { label: 'Forwarded from Orig', name: 'Orig', from: { id: 7 } },
    })
    expect(membershipIds([msg])).toEqual([50])
  })

  it('includes the quoter', () => {
    expect(membershipIds([m({ from: { id: 10, name: 'A' } })], 99)).toEqual([10, 99])
  })

  it('dedups and drops synthetic (non-positive) ids', () => {
    const msgs = [
      m({ from: { id: 10, name: 'A' } }),
      m({ from: { id: 10, name: 'A' } }),
      m({ from: { id: -123, name: 'Hidden' } }),
    ]
    expect(membershipIds(msgs, 10)).toEqual([10])
  })
})

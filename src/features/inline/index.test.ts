import { describe, it, expect } from 'vitest'
import { nextOffset } from './index'

// LIMIT is 50 in the module under test.
describe('nextOffset', () => {
  it('advances by the page size on a full raw page', () => {
    expect(nextOffset(0, 50)).toBe('50')
    expect(nextOffset(50, 50)).toBe('100')
  })

  it('ends pagination when the raw page is short', () => {
    expect(nextOffset(50, 49)).toBe('')
    expect(nextOffset(0, 0)).toBe('')
  })
})

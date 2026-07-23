import { describe, it, expect } from 'vitest'
import { parseQuoteArgs } from './parse-args'

describe('parseQuoteArgs', () => {
  it('returns all-false defaults with empty unknown for empty input', () => {
    expect(parseQuoteArgs('')).toEqual({
      reply: false,
      png: false,
      img: false,
      rate: false,
      hidden: false,
      media: false,
      crop: false,
      stories: false,
      unknown: [],
    })
  })

  it('parses boolean flags by both aliases, case-insensitively', () => {
    expect(parseQuoteArgs('reply')).toMatchObject({ reply: true })
    expect(parseQuoteArgs('R')).toMatchObject({ reply: true })
    expect(parseQuoteArgs('M C')).toMatchObject({ media: true, crop: true })
  })

  it('treats bare "s" as stories but "s<number>" as scale', () => {
    expect(parseQuoteArgs('s')).toMatchObject({ stories: true })
    expect(parseQuoteArgs('S2')).toMatchObject({ scale: 2 })
    expect(parseQuoteArgs('s1.5')).toMatchObject({ scale: 1.5 })
  })

  it('parses integer count, including negative', () => {
    expect(parseQuoteArgs('3')).toMatchObject({ count: 3 })
    expect(parseQuoteArgs('-3')).toMatchObject({ count: -3 })
  })

  it('recognizes and normalizes colors', () => {
    expect(parseQuoteArgs('red').color).toEqual({ kind: 'solid', color: 'red' })
    expect(parseQuoteArgs('cbafff').color).toEqual({ kind: 'solid', color: '#cbafff' })
    expect(parseQuoteArgs('#FFF').color).toEqual({ kind: 'solid', color: '#fff' })
    expect(parseQuoteArgs('red/blue').color).toEqual({ kind: 'gradient', from: 'red', to: 'blue' })
    expect(parseQuoteArgs('//222').color).toEqual({ kind: 'autoGradient', base: '#222' })
    expect(parseQuoteArgs('random').color).toEqual({ kind: 'random' })
    expect(parseQuoteArgs('transparent').color).toEqual({ kind: 'transparent' })
  })

  it('collects tokens it cannot classify into unknown', () => {
    const r = parseQuoteArgs('reply notacolor 3')
    expect(r.reply).toBe(true)
    expect(r.count).toBe(3)
    expect(r.unknown).toEqual(['notacolor'])
  })

  it('keeps only the first color and first count', () => {
    expect(parseQuoteArgs('red blue').color).toEqual({ kind: 'solid', color: 'red' })
    expect(parseQuoteArgs('3 5')).toMatchObject({ count: 3, unknown: ['5'] })
  })

  it('combines count, color and flags in any order', () => {
    expect(parseQuoteArgs('m 3 #cbafff')).toMatchObject({
      media: true,
      count: 3,
      color: { kind: 'solid', color: '#cbafff' },
    })
  })
})

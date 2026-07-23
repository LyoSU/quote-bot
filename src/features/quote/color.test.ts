import { describe, it, expect } from 'vitest'
import { parseColor, buildBackgroundColor, randomHexColor } from './color'

describe('parseColor', () => {
  it('normalizes hex with and without #', () => {
    expect(parseColor('#cbafff')).toEqual({ kind: 'solid', color: '#cbafff' })
    expect(parseColor('cbafff')).toEqual({ kind: 'solid', color: '#cbafff' })
    expect(parseColor('FFF')).toEqual({ kind: 'solid', color: '#fff' })
    expect(parseColor('#11223344')).toEqual({ kind: 'solid', color: '#11223344' })
  })

  it('accepts CSS names and rgb()', () => {
    expect(parseColor('skyblue')).toEqual({ kind: 'solid', color: 'skyblue' })
    expect(parseColor('rgb(1,2,3)')).toEqual({ kind: 'solid', color: 'rgb(1,2,3)' })
    expect(parseColor('rgba(0,0,0,0.5)')).toEqual({ kind: 'solid', color: 'rgba(0,0,0,0.5)' })
  })

  it('parses gradients and auto-gradients', () => {
    expect(parseColor('red/blue')).toEqual({ kind: 'gradient', from: 'red', to: 'blue' })
    expect(parseColor('aaa/bbb')).toEqual({ kind: 'gradient', from: '#aaa', to: '#bbb' })
    expect(parseColor('//222')).toEqual({ kind: 'autoGradient', base: '#222' })
    expect(parseColor('//random')).toEqual({ kind: 'autoGradient', base: 'random' })
  })

  it('handles keywords', () => {
    expect(parseColor('random')).toEqual({ kind: 'random' })
    expect(parseColor('transparent')).toEqual({ kind: 'transparent' })
  })

  it('returns null for non-colors', () => {
    expect(parseColor('hello')).toBeNull()
    expect(parseColor('r')).toBeNull()
    expect(parseColor('red/notacolor')).toBeNull()
  })
})

describe('buildBackgroundColor', () => {
  const zero = () => 0 // deterministic RNG → #000000

  it('builds each spec into a renderer string', () => {
    expect(buildBackgroundColor({ kind: 'transparent' })).toBe('rgba(0,0,0,0)')
    expect(buildBackgroundColor({ kind: 'solid', color: 'red' })).toBe('red')
    expect(buildBackgroundColor({ kind: 'autoGradient', base: '#222' })).toBe('//#222')
    expect(buildBackgroundColor({ kind: 'gradient', from: 'red', to: 'blue' })).toBe('red/blue')
    expect(buildBackgroundColor({ kind: 'random' }, zero)).toBe('#000000/#000000')
    expect(buildBackgroundColor({ kind: 'autoGradient', base: 'random' }, zero)).toBe('//#000000')
  })
})

describe('randomHexColor', () => {
  it('produces a 6-digit hex', () => {
    expect(randomHexColor(() => 0)).toBe('#000000')
    expect(randomHexColor(() => 0.999999)).toMatch(/^#[0-9a-f]{6}$/)
  })
})

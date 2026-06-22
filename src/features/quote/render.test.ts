import { describe, it, expect } from 'vitest'
import {
  resolveBackgroundColor,
  resolveEmojiBrand,
  resolveRenderSpec,
  resolveStickerEmojis,
  DEFAULT_STICKER_EMOJI,
} from './render'
import { DEFAULT_BACKGROUND } from './color'
import { parseQuoteArgs } from './parse-args'

describe('resolveRenderSpec', () => {
  it('defaults to a 512×768 @2× webp sticker', () => {
    const spec = resolveRenderSpec(parseQuoteArgs(''))
    expect(spec).toEqual({ type: 'quote', format: 'webp', width: 512, height: 768, scale: 2, delivery: 'sticker' })
  })

  it('renders img as a png photo', () => {
    const spec = resolveRenderSpec(parseQuoteArgs('img'))
    expect(spec.type).toBe('image')
    expect(spec.format).toBe('png')
    expect(spec.delivery).toBe('photo')
  })

  it('renders png as a png document', () => {
    const spec = resolveRenderSpec(parseQuoteArgs('png'))
    expect(spec.delivery).toBe('document')
    expect(spec.format).toBe('png')
  })

  it('renders stories with the tall canvas and 3× scale', () => {
    const spec = resolveRenderSpec(parseQuoteArgs('stories'))
    expect(spec.type).toBe('stories')
    expect(spec.scale).toBe(3)
    expect(spec.delivery).toBe('photo')
  })

  it('honors an explicit scale flag over the computed default', () => {
    expect(resolveRenderSpec(parseQuoteArgs('s1.5')).scale).toBe(1.5)
  })
})

describe('resolveBackgroundColor', () => {
  it('uses an explicit color flag with an injected RNG', () => {
    const flag = parseQuoteArgs('random').color
    expect(resolveBackgroundColor(flag, undefined, () => 0)).toBe('#000000/#000000')
  })

  it('falls back to the stored setting, then the default', () => {
    expect(resolveBackgroundColor(undefined, '#123456')).toBe('#123456')
    expect(resolveBackgroundColor(undefined, null)).toBe(DEFAULT_BACKGROUND)
    expect(resolveBackgroundColor(undefined, undefined)).toBe(DEFAULT_BACKGROUND)
  })

  it('rolls a fresh gradient for a stored "random" preset instead of passing it through', () => {
    expect(resolveBackgroundColor(undefined, 'random', () => 0)).toBe('#000000/#000000')
  })
})

describe('resolveStickerEmojis / resolveEmojiBrand', () => {
  it('returns the suffix unless it is "random"', () => {
    expect(resolveStickerEmojis('🔥')).toEqual(['🔥'])
    expect(resolveStickerEmojis('random')).toEqual([DEFAULT_STICKER_EMOJI])
    expect(resolveStickerEmojis(null)).toEqual([DEFAULT_STICKER_EMOJI])
  })

  it('defaults the emoji brand to apple', () => {
    expect(resolveEmojiBrand('google')).toBe('google')
    expect(resolveEmojiBrand(undefined)).toBe('apple')
  })
})

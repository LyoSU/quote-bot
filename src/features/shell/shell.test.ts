import { describe, it, expect } from 'vitest'
import { featuresKeyboard } from './index'

const t = (k: string): string => k
const callbacks = (kb: ReturnType<typeof featuresKeyboard>): string[] =>
  kb.inline_keyboard.flat().flatMap((b) => ('callback_data' in b ? [b.callback_data] : []))

describe('featuresKeyboard', () => {
  it('lists the four feature tabs plus a back button', () => {
    expect(callbacks(featuresKeyboard(t))).toEqual([
      'menu:f_basics',
      'menu:f_colors',
      'menu:f_media',
      'menu:f_group',
      'menu:guide',
    ])
  })

  it('has no back button when it is the root (group /help)', () => {
    expect(callbacks(featuresKeyboard(t, null))).not.toContain('menu:guide')
    expect(featuresKeyboard(t, null).inline_keyboard).toHaveLength(2)
  })
})

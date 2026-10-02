import { describe, expect, it } from 'vitest'
import { buildQuoteReplyMarkup, buildRatingKeyboard } from './reply-markup'
import { quoteLinkLabel } from './app-link'

const url = 'https://t.me/bot/app?startapp=q_5_g_x'

describe('buildQuoteReplyMarkup', () => {
  it('puts the app link in the same row as 👍/👎', () => {
    const { reply_markup } = buildQuoteReplyMarkup({ rateEnabled: true, deepLinkUrl: url, openInAppLabel: '№5 ↗' })
    expect(reply_markup!.inline_keyboard).toEqual([
      [
        { text: '👍', callback_data: 'rate:👍' },
        { text: '👎', callback_data: 'rate:👎' },
        { text: '№5 ↗', url },
      ],
    ])
  })

  it('keeps the link alone in its row when rating is disabled', () => {
    const { reply_markup } = buildQuoteReplyMarkup({ rateEnabled: false, deepLinkUrl: url, openInAppLabel: '№5 ↗' })
    expect(reply_markup!.inline_keyboard).toEqual([[{ text: '№5 ↗', url }]])
  })

  it('returns no markup without buttons', () => {
    expect(buildQuoteReplyMarkup({})).toEqual({})
  })

  it('keeps vote-only keyboards when the link is hidden', () => {
    const { reply_markup } = buildQuoteReplyMarkup({ rateEnabled: true })
    expect(reply_markup!.inline_keyboard).toHaveLength(1)
    expect(reply_markup!.inline_keyboard[0]).toHaveLength(2)
  })
})

describe('buildRatingKeyboard', () => {
  it('shows counts and a single row including the link', () => {
    const kb = buildRatingKeyboard({ rate: { votes: [{ vote: [1, 2] }, { vote: [] }] } }, { url, label: '🏆 №1 тижня' })
    expect(kb.inline_keyboard).toEqual([
      [
        { text: '👍 2', callback_data: 'rate:👍' },
        { text: '👎', callback_data: 'rate:👎' },
        { text: '🏆 №1 тижня', url },
      ],
    ])
  })
})

describe('quoteLinkLabel', () => {
  const t = (k: string) => (k === 'app-open_top_week' ? '🏆 №1 тижня' : k)
  it('defaults to № + local id', () => expect(quoteLinkLabel(t, 42, false)).toBe('№42 ↗'))
  it('uses the weekly-top badge', () => expect(quoteLinkLabel(t, 42, true)).toBe('🏆 №1 тижня'))
})

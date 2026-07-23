import { describe, it, expect } from 'vitest'
import { denormalizeQuote } from './denormalize'
import type { QuoteMessage } from '../../services/quote-api/types'

const baseMsg = (over: Partial<QuoteMessage> = {}): QuoteMessage => ({
  message_id: 1,
  from: { id: 1, first_name: 'Alice' },
  ...over,
})

describe('denormalizeQuote', () => {
  it('collects unique authors by id', () => {
    const messages = [
      baseMsg({ message_id: 1, from: { id: 1, first_name: 'Alice' } }),
      baseMsg({ message_id: 2, from: { id: 1, first_name: 'Alice' } }),
      baseMsg({ message_id: 3, from: { id: 2, first_name: 'Bob' } }),
    ]
    const out = denormalizeQuote(messages, { chat: { id: 100 } })
    expect(out.authors.map((a) => a.telegram_id)).toEqual([1, 2])
    expect(out.messageCount).toBe(3)
    expect(out.source.chat_id).toBe(100)
    expect(out.source.message_ids).toEqual([1, 2, 3])
  })

  it('hides authors and source identifiers under privacy', () => {
    const out = denormalizeQuote([baseMsg()], { chat: { id: 100 } }, { privacy: true })
    expect(out.authors).toEqual([])
    expect(out.source.chat_id).toBeUndefined()
    expect(out.source.message_ids).toBeUndefined()
  })

  it('detects voice and media (incl. reply media)', () => {
    const messages = [
      baseMsg({ message_id: 1, voice: { waveform: [], duration: 3 } }),
      baseMsg({ message_id: 2, media: [{ file_id: 'x' }], from: { id: 2, first_name: 'B' } }),
      baseMsg({ message_id: 3, from: { id: 3, first_name: 'C' }, replyMessage: { media: { kind: 'photo', fileId: 'p' } } }),
    ]
    const out = denormalizeQuote(messages, {})
    expect(out.hasVoice).toBe(true)
    expect(out.hasMedia).toBe(true)
  })

  it('counts canonical audio, document, story and paid-preview payloads as media', () => {
    for (const message of [
      baseMsg({ audio: { title: 'Song' } }),
      baseMsg({ document: { file_name: 'report.pdf' } }),
      baseMsg({ mediaType: 'story' }),
      baseMsg({ mediaType: 'paid_preview' }),
    ]) {
      expect(denormalizeQuote([message], {}).hasMedia).toBe(true)
    }
  })

  it('includes forward authors', () => {
    const out = denormalizeQuote(
      [baseMsg({ forward: { label: 'Forwarded from Bob', name: 'Bob', from: { id: 50, kind: 'user' } } })],
      {},
    )
    expect(out.authors.some((a) => a.telegram_id === 50 && a.name === 'Bob')).toBe(true)
  })

  it('derives the source date from the first dated message', () => {
    const out = denormalizeQuote([baseMsg({ date: 1_700_000_000 })], {})
    expect(out.source.date.getTime()).toBe(1_700_000_000 * 1000)
  })
})

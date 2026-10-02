import { describe, it, expect } from 'vitest'
import { DEFAULT_LABELS, hasSpecialContent, labelsFromTranslator, LABEL_KINDS, specialText } from './labels'
import { buildQuoteMessage, buildReplyMessage } from './build-message'
import type { Sender } from './sender'

const alice: Sender = { id: 1, first_name: 'Alice' }
const build = (source: Parameters<typeof buildQuoteMessage>[0]['source']) =>
  buildQuoteMessage({ source, from: alice, isFirstInStreak: true, showReply: true, crop: false, forceMedia: false, unsupportedText: 'Unsupported' })

describe('specialText (B15)', () => {
  it('renders a poll as a question line plus up to 6 options', () => {
    const r = specialText({
      poll: { question: 'Best pet?', options: Array.from({ length: 8 }, (_, i) => ({ text: `opt${i + 1}` })) },
    })!
    const lines = r.text.split('\n')
    expect(lines[0]).toBe('📊 Best pet?')
    expect(lines.slice(1, 7)).toEqual(['• opt1', '• opt2', '• opt3', '• opt4', '• opt5', '• opt6'])
    expect(lines[7]).toBe('…')
    expect(r.entities).toEqual([{ type: 'bold', offset: 3, length: 9 }])
  })

  it('renders a dice as its bare emoji (big-emoji path)', () => {
    expect(specialText({ dice: { emoji: '🎲', value: 4 } })).toEqual({ text: '🎲' })
  })

  it('renders a venue and a plain location', () => {
    expect(specialText({ venue: { title: 'Café', address: 'Main St 1' } })!.text).toBe('📍 Café\nMain St 1')
    expect(specialText({ location: { latitude: 1, longitude: 2 } })!.text).toBe('📍 Location')
  })

  it('renders a contact by name only (no phone)', () => {
    const r = specialText({ contact: { first_name: 'Ada', last_name: 'L' } })!
    expect(r.text).toBe('👤 Ada L')
    expect(JSON.stringify(r)).not.toMatch(/\d{5}/)
  })

  it('detects special content', () => {
    expect(hasSpecialContent({})).toBe(false)
    expect(hasSpecialContent({ poll: { question: 'q' } })).toBe(true)
  })
})

describe('buildQuoteMessage with special content (B15)', () => {
  it('quotes a poll instead of "unsupported"', () => {
    const m = build({ poll: { question: 'Q?', options: [{ text: 'a' }, { text: 'b' }] } })
    expect(m.text).toBe('📊 Q?\n• a\n• b')
  })

  it('quotes a location with the localized label', () => {
    const labels = { ...DEFAULT_LABELS, kinds: { ...DEFAULT_LABELS.kinds, location: 'Геопозиція' } }
    const m = buildQuoteMessage({
      source: { location: { latitude: 1, longitude: 2 } },
      from: alice,
      isFirstInStreak: true,
      showReply: false,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
      labels,
    })
    expect(m.text).toBe('📍 Геопозиція')
  })

  it('does not override real text', () => {
    expect(build({ text: 'hi', poll: { question: 'Q' } }).text).toBe('hi')
  })
})

describe('buildReplyMessage labels (B3)', () => {
  it.each([
    ['photo', { photo: [{ file_id: 'p' }] }, 'Photo'],
    ['sticker', { sticker: { thumb: { file_id: 't' } } }, 'Sticker'],
    ['voice', { voice: { duration: 3 } }, 'Voice message'],
    ['video', { video: { thumbnail: { file_id: 't' } } }, 'Video'],
    ['gif', { animation: { thumbnail: { file_id: 't' } } }, 'GIF'],
    ['video note', { video_note: {} }, 'Video message'],
    ['audio', { audio: { duration: 3 } }, 'Audio'],
    ['document', { document: {} }, 'Document'],
    ['named document', { document: { file_name: 'a.pdf' } }, 'a.pdf'],
    ['poll', { poll: { question: 'Q?' } }, '📊 Q?'],
    ['location', { location: { latitude: 1, longitude: 2 } }, '📍 Location'],
    ['contact', { contact: { first_name: 'Ada' } }, '👤 Ada'],
  ] as const)('labels a %s reply', (_n, reply, expected) => {
    expect(buildReplyMessage(reply as never, alice).text).toBe(expected)
  })

  it('keeps the thumbnail media alongside the label', () => {
    const r = buildReplyMessage({ photo: [{ file_id: 'p' }] }, alice)
    expect(r.media).toEqual({ kind: 'photo', fileId: 'p' })
  })

  it('prefers real text/caption over a label', () => {
    expect(buildReplyMessage({ photo: [{ file_id: 'p' }], caption: 'look' }, alice).text).toBe('look')
  })

  it('leaves text empty when there is nothing to label', () => {
    expect(buildReplyMessage({}, alice).text).toBeUndefined()
  })

  it('uses the injected localized label', () => {
    const labels = { ...DEFAULT_LABELS, kinds: { ...DEFAULT_LABELS.kinds, photo: 'Фото' } }
    expect(buildReplyMessage({ photo: [{ file_id: 'p' }] }, alice, undefined, labels).text).toBe('Фото')
  })
})

describe('labelsFromTranslator', () => {
  it('maps every kind and the forward strings through the translator', () => {
    const t = (key: string, args?: Record<string, string>) => (args ? `${key}:${args.name}` : key)
    const l = labelsFromTranslator(t)
    for (const k of LABEL_KINDS) expect(l.kinds[k]).toBe(`quote-kind-${k}`)
    expect(l.forwardedFrom('Bob')).toBe('quote-forward-from:Bob')
    expect(l.forwardedMessage).toBe('quote-forward-message')
  })
})

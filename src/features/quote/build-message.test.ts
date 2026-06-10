import { describe, it, expect } from 'vitest'
import { buildQuoteMessage, buildReplyMessage } from './build-message'
import type { Sender } from './sender'

const alice: Sender = { id: 1, first_name: 'Alice', last_name: 'A', username: 'alice' }

describe('buildQuoteMessage', () => {
  it('shows the name on the first message of a streak', () => {
    const m = buildQuoteMessage({
      source: { text: 'hi' },
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBe('hi')
    expect(m.from?.name).toBe('Alice A')
    expect(m.chatId).toBe(1)
    expect(m.avatar).toBe(true)
  })

  it('suppresses the name on streak continuation', () => {
    const m = buildQuoteMessage({
      source: { text: 'again' },
      from: alice,
      isFirstInStreak: false,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.from?.name).toBe(false)
    expect(m.from?.first_name).toBe('Alice')
  })

  it('prefers caption over text and attaches media', () => {
    const m = buildQuoteMessage({
      source: { caption: 'cap', caption_entities: [], photo: [{ file_id: 'p', file_unique_id: 'u', width: 1, height: 1 }] },
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBe('cap')
    expect(m.mediaType).toBe('photo')
  })

  it('falls back to unsupported text when there is no content', () => {
    const m = buildQuoteMessage({
      source: {},
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBe('Unsupported')
    expect(m.entities).toEqual([{ type: 'italic', offset: 0, length: 'Unsupported'.length }])
  })

  it('keeps a text-less document as a document row (not unsupported)', () => {
    const m = buildQuoteMessage({
      source: { document: { file_id: 'pdf', mime_type: 'application/pdf', file_name: 'report.pdf', file_size: 2048 } },
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBeUndefined()
    expect(m.document).toEqual({ file_name: 'report.pdf', file_size: 2048 })
  })

  it('keeps a text-less audio as an audio row (not unsupported)', () => {
    const m = buildQuoteMessage({
      source: { audio: { file_id: 'aud', title: 'Song', performer: 'Artist', duration: 100 } },
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBeUndefined()
    expect(m.audio).toEqual({ title: 'Song', performer: 'Artist', duration: 100 })
  })

  it('adds a forward label and sender tag', () => {
    const m = buildQuoteMessage({
      source: { text: 'x', sender_tag: 'Admin' },
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      forward: { label: 'Forwarded from Bob' },
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.forward).toEqual({ label: 'Forwarded from Bob' })
    expect(m.senderTag).toBe('Admin')
  })

  it('marks an explicit quote selection', () => {
    const m = buildQuoteMessage({
      source: { text: 'full', quote: { text: 'part' } },
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBe('part')
    expect(m.isQuote).toBe(true)
  })

  it('drops media for a partial quote', () => {
    const m = buildQuoteMessage({
      source: {
        caption: 'full caption',
        photo: [{ file_id: 'p', file_unique_id: 'pu', width: 1, height: 1 }],
        quote: { text: 'part' },
      },
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBe('part')
    expect(m.isQuote).toBe(true)
    expect(m.media).toBeUndefined()
  })

  it('keeps media for a partial quote when the m flag is set', () => {
    const m = buildQuoteMessage({
      source: {
        caption: 'full caption',
        photo: [{ file_id: 'p', file_unique_id: 'pu', width: 1, height: 1 }],
        quote: { text: 'part' },
      },
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: true,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBe('part')
    expect(m.media).toBeDefined()
  })
})

describe('buildReplyMessage', () => {
  it('maps reply text, name and chatId', () => {
    const r = buildReplyMessage({ text: 'orig' }, { id: 7, first_name: 'Bob' })
    expect(r).toMatchObject({ name: 'Bob', chatId: 7, text: 'orig' })
  })

  it('synthesizes chatId from name when sender has no id', () => {
    const r = buildReplyMessage({ text: 'x' }, { name: 'Ghost' })
    expect(r.name).toBe('Ghost')
    expect(typeof r.chatId).toBe('number')
  })

  it('captures reply media kind', () => {
    const r = buildReplyMessage({ photo: [{ file_id: 'pp' }] }, null)
    expect(r.media).toEqual({ kind: 'photo', fileId: 'pp' })
  })
})

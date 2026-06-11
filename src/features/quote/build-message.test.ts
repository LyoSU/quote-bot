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

  it('carries the source message_id through (denormalize reads it)', () => {
    const m = buildQuoteMessage({
      source: { message_id: 42, text: 'hi' },
      from: alice,
      isFirstInStreak: true,
      showReply: false,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.message_id).toBe(42)
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
      source: { text: 'full', selection: { text: 'part' } },
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
        selection: { text: 'part' },
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
        selection: { text: 'part' },
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

  it("never renders the message's own reply-quote as its body", () => {
    // A Bot API `quote` on the source is the fragment its author quoted from
    // the PARENT message — someone else's words. The body must stay the
    // author's own text.
    const m = buildQuoteMessage({
      source: {
        text: 'my own reply',
        quote: { text: 'parent fragment' },
        reply_to_message: { text: 'parent full text' },
      },
      from: alice,
      isFirstInStreak: true,
      showReply: false,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBe('my own reply')
    expect(m.isQuote).toBeUndefined()
  })

  it("keeps media when the source carries its own reply-quote", () => {
    const m = buildQuoteMessage({
      source: {
        caption: 'cap',
        photo: [{ file_id: 'p', file_unique_id: 'pu', width: 1, height: 1 }],
        quote: { text: 'parent fragment' },
      },
      from: alice,
      isFirstInStreak: true,
      showReply: false,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBe('cap')
    expect(m.media).toBeDefined()
  })

  it("shows the source's own reply-quote fragment on the reply block", () => {
    // Telegram renders a reply-with-quote header with the quoted fragment,
    // not the parent's full text — match that.
    const m = buildQuoteMessage({
      source: {
        text: 'my own reply',
        quote: { text: 'parent fragment', entities: [{ type: 'bold', offset: 0, length: 6 }] },
        reply_to_message: { text: 'parent full text', entities: [{ type: 'italic', offset: 0, length: 4 }] },
      },
      from: alice,
      replyFrom: { id: 7, first_name: 'Bob' },
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })
    expect(m.text).toBe('my own reply')
    expect(m.replyMessage).toMatchObject({ name: 'Bob', text: 'parent fragment' })
    expect(m.replyMessage?.entities).toEqual([{ type: 'bold', offset: 0, length: 6 }])
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

  it('prefers the quoted fragment over the full reply text', () => {
    const r = buildReplyMessage({ text: 'full', entities: [{ type: 'italic', offset: 0, length: 4 }] }, null, {
      text: 'frag',
    })
    expect(r.text).toBe('frag')
    // The reply's own entities have offsets into the full text — never mix them in.
    expect(r.entities).toBeUndefined()
  })
})

import { describe, it, expect } from 'vitest'
import type * as Td from 'tdlib-types'
import {
  decodeWaveform,
  mapEntities,
  mapChatType,
  normalizeContent,
  toBotApiMessageId,
  toTdlibMessageId,
  TDLIB_MESSAGE_ID_SHIFT,
} from './normalize'

const td = <T>(o: unknown): T => o as T

describe('message id conversion', () => {
  it('round-trips between TDLib and Bot API ids', () => {
    expect(toTdlibMessageId(123)).toBe(123 * TDLIB_MESSAGE_ID_SHIFT)
    expect(toBotApiMessageId(123 * TDLIB_MESSAGE_ID_SHIFT)).toBe(123)
  })
})

describe('mapChatType', () => {
  it('maps basic types', () => {
    expect(mapChatType(td({ _: 'chatTypePrivate' }))).toBe('private')
    expect(mapChatType(td({ _: 'chatTypeBasicGroup' }))).toBe('group')
  })
  it('promotes a channel supergroup to "channel"', () => {
    expect(mapChatType(td({ _: 'chatTypeSupergroup', is_channel: true }))).toBe('channel')
    expect(mapChatType(td({ _: 'chatTypeSupergroup', is_channel: false }))).toBe('supergroup')
  })
})

describe('mapEntities', () => {
  it('maps types and carries type-specific fields', () => {
    const entities = td<Td.textEntity[]>([
      { _: 'textEntity', offset: 0, length: 4, type: { _: 'textEntityTypeBold' } },
      { _: 'textEntity', offset: 5, length: 3, type: { _: 'textEntityTypeTextUrl', url: 'http://x' } },
      { _: 'textEntity', offset: 9, length: 2, type: { _: 'textEntityTypeMentionName', user_id: 42 } },
      { _: 'textEntity', offset: 12, length: 1, type: { _: 'textEntityTypeCustomEmoji', custom_emoji_id: '99' } },
    ])
    const out = mapEntities(entities)
    expect(out).toEqual([
      { type: 'bold', offset: 0, length: 4 },
      { type: 'text_link', offset: 5, length: 3, url: 'http://x' },
      { type: 'text_mention', offset: 9, length: 2, user: { id: 42 } },
      { type: 'custom_emoji', offset: 12, length: 1, custom_emoji_id: '99' },
    ])
  })

  it('drops entity types with no Bot API mapping', () => {
    const out = mapEntities(td([{ _: 'textEntity', offset: 0, length: 1, type: { _: 'textEntityTypeBankCardNumber' } }]))
    expect(out).toEqual([])
  })
})

describe('decodeWaveform', () => {
  it('returns 5-bit values in range with correct count', () => {
    const buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff]) // 40 bits → 8 values
    const out = decodeWaveform(buf)
    expect(out).toHaveLength(8)
    expect(out.every((v) => v === 31)).toBe(true)
  })
  it('returns [] for empty input', () => {
    expect(decodeWaveform(Buffer.from([]))).toEqual([])
  })
})

describe('normalizeContent', () => {
  it('maps text with entities', () => {
    const out = normalizeContent(
      td({ _: 'messageText', text: { _: 'formattedText', text: 'hello', entities: [{ _: 'textEntity', offset: 0, length: 5, type: { _: 'textEntityTypeBold' } }] } }),
    )
    expect(out.text).toBe('hello')
    expect(out.entities).toEqual([{ type: 'bold', offset: 0, length: 5 }])
  })

  it('maps a photo with caption + caption entities', () => {
    const out = normalizeContent(
      td({
        _: 'messagePhoto',
        photo: { sizes: [{ photo: { remote: { id: 'fid', unique_id: 'uid' }, size: 100 }, width: 90, height: 90 }] },
        caption: { text: 'cap', entities: [{ _: 'textEntity', offset: 0, length: 3, type: { _: 'textEntityTypeItalic' } }] },
      }),
    )
    expect(out.photo).toEqual([{ file_id: 'fid', file_unique_id: 'uid', file_size: 100, width: 90, height: 90 }])
    expect(out.caption).toBe('cap')
    expect(out.caption_entities).toEqual([{ type: 'italic', offset: 0, length: 3 }])
  })

  it('flags unmapped content as unsupported', () => {
    const out = normalizeContent(td({ _: 'messagePoll' }))
    expect(out.unsupportedMessage).toBe(true)
  })
})

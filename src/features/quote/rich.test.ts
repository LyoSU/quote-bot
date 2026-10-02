import { describe, it, expect } from 'vitest'
import type { QuoteMessage } from '../../services/quote-api/types'
import { buildQuoteMessage, buildReplyMessage } from './build-message'
import { DEFAULT_LABELS } from './labels'
import {
  applyRich,
  convertRichMessage,
  fallbackOf,
  hasRichContent,
  richTextToEntities,
  truncateRichText,
  RICH_LIMITS,
  type RichBlock,
  type RichMessage,
} from './rich'
import type { Sender } from './sender'

const alice: Sender = { id: 1, first_name: 'Alice' }
const p = (text: RichBlock['text']): RichBlock => ({ type: 'paragraph', text })
const photo = (id: string, spoiler = false): RichBlock => ({
  type: 'photo',
  photo: [{ file_id: id, file_unique_id: id, width: 800, height: 600 }],
  ...(spoiler ? { has_spoiler: true } : {}),
})

describe('richTextToEntities', () => {
  it('flattens plain strings and arrays', () => {
    expect(richTextToEntities(['a', ['b', 'c']])).toEqual({ text: 'abc', entities: [] })
  })

  it('maps nested formatting with outer entities first', () => {
    const r = richTextToEntities([
      'x ',
      { type: 'bold', text: ['b ', { type: 'italic', text: 'bi' }] },
      { type: 'url', text: 'link', url: 'https://t.me' },
    ])
    expect(r.text).toBe('x b bilink')
    expect(r.entities).toEqual([
      { type: 'bold', offset: 2, length: 4 },
      { type: 'italic', offset: 4, length: 2 },
      { type: 'text_link', offset: 6, length: 4, url: 'https://t.me' },
    ])
  })

  it('counts offsets in UTF-16 code units (surrogate pairs, ZWJ emoji)', () => {
    const r = richTextToEntities(['😀👨‍👩‍👧 ', { type: 'code', text: 'x' }])
    // 😀 = 2 units, 👨‍👩‍👧 = 8 units, space = 1
    expect(r.entities).toEqual([{ type: 'code', offset: 11, length: 1 }])
    expect(r.text.slice(11, 12)).toBe('x')
  })

  it('keeps custom_emoji_id and uses the alternative text', () => {
    const r = richTextToEntities(['hi ', { type: 'custom_emoji', custom_emoji_id: '5368', alternative_text: '🔥' }])
    expect(r.text).toBe('hi 🔥')
    expect(r.entities).toEqual([{ type: 'custom_emoji', offset: 3, length: 2, custom_emoji_id: '5368' }])
  })

  it('maps detected-entity nodes and inline math; drops marks without a look', () => {
    const r = richTextToEntities([
      { type: 'hashtag', text: '#a', hashtag: 'a' },
      ' ',
      { type: 'mathematical_expression', expression: 'x^2' },
      ' ',
      { type: 'marked', text: 'm' },
      { type: 'superscript', text: '2' },
      { type: 'anchor', name: 'n' } as never,
    ])
    expect(r.text).toBe('#a x^2 m2')
    expect(r.entities).toEqual([
      { type: 'hashtag', offset: 0, length: 2 },
      { type: 'code', offset: 3, length: 3 },
    ])
  })

  it('survives garbage without throwing', () => {
    expect(richTextToEntities(undefined).text).toBe('')
    expect(richTextToEntities({ type: 'bold' }).entities).toEqual([])
    expect(richTextToEntities([null as never, 5 as never, 'ok']).text).toBe('ok')
  })
})

describe('truncateRichText', () => {
  it('cuts with an ellipsis, clips entities and never splits a surrogate pair', () => {
    const t = { text: 'ab😀cdef', entities: [{ type: 'bold' as const, offset: 0, length: 8 }, { type: 'italic' as const, offset: 6, length: 2 }] }
    const r = truncateRichText(t, 4) // cut at 3 would split 😀 → backs off to 2
    expect(r.text).toBe('ab…')
    expect(r.entities).toEqual([{ type: 'bold', offset: 0, length: 2 }])
  })

  it('drops a custom emoji cut in half', () => {
    const t = { text: 'a🔥bbbb', entities: [{ type: 'custom_emoji' as const, offset: 1, length: 2, custom_emoji_id: '1' }] }
    expect(truncateRichText(t, 3).entities).toEqual([])
  })

  it('leaves short text untouched', () => {
    const t = { text: 'short', entities: [] }
    expect(truncateRichText(t, 10)).toBe(t)
  })
})

describe('convertRichMessage — blocks', () => {
  const conv = (blocks: RichBlock[], extra: Partial<RichMessage> = {}) => convertRichMessage({ blocks, ...extra })

  it('paragraph and heading', () => {
    const c = conv([{ type: 'heading', size: 2, text: 'Title' }, p(['Hello ', { type: 'bold', text: 'world' }])])
    expect(c.rich?.blocks).toEqual([
      { type: 'heading', level: 2, text: 'Title' },
      { type: 'paragraph', text: 'Hello world', entities: [{ type: 'bold', offset: 6, length: 5 }] },
    ])
    expect(c.text).toBe('Title\nHello world')
    expect(c.entities).toEqual([
      { type: 'bold', offset: 0, length: 5 },
      { type: 'bold', offset: 12, length: 5 },
    ])
  })

  it('flattens nested lists into depth, with ordered markers and checkboxes', () => {
    const c = conv([
      {
        type: 'list',
        items: [
          { label: '1', blocks: [p('one'), { type: 'list', items: [{ label: '•', blocks: [p('sub')] }] }] },
          { value: 2, type: 'i', blocks: [p('two')] },
          { has_checkbox: true, is_checked: true, blocks: [p('done')] },
        ],
      },
    ])
    expect(c.rich?.blocks[0]).toEqual({
      type: 'list',
      ordered: true,
      items: [
        { text: 'one', depth: 0, marker: '1.' },
        { text: 'sub', depth: 1 },
        { text: 'two', depth: 0, marker: 'ii.' },
        { text: 'done', depth: 0, check: true },
      ],
    })
    expect(c.text).toBe('1. one\n  • sub\nii. two\n☑ done')
  })

  it('caps list items and reports the rest', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ blocks: [p(`i${i}`)] }))
    const b = conv([{ type: 'list', items }]).rich?.blocks[0]
    expect(b).toMatchObject({ type: 'list', ordered: false, more: 30 - RICH_LIMITS.listItems })
    expect((b as { items: unknown[] }).items).toHaveLength(RICH_LIMITS.listItems)
  })

  it('quotes: blockquote of blocks with credit, pull quote, expandable', () => {
    const c = conv([
      { type: 'blockquote', blocks: [p('a'), p('b')], credit: 'Me' },
      { type: 'pullquote', text: 'big' },
      { type: 'expandable_blockquote', text: 'more' },
    ])
    expect(c.rich?.blocks).toEqual([
      { type: 'quote', text: 'a\nb', credit: { text: 'Me' } },
      { type: 'quote', text: 'big', pull: true },
      { type: 'quote', text: 'more' },
    ])
    expect(c.text).toBe('a\nb\n— Me\nbig\nmore')
    expect(c.entities[0]).toEqual({ type: 'blockquote', offset: 0, length: 8 })
  })

  it('pre, math, divider, footer', () => {
    const c = conv([
      p('x'),
      { type: 'pre', text: 'let a = 1', language: 'ts' },
      { type: 'divider' },
      { type: 'mathematical_expression', expression: 'E = mc^2' },
      { type: 'footer', text: 'fin' },
    ])
    expect(c.rich?.blocks).toEqual([
      { type: 'paragraph', text: 'x' },
      { type: 'pre', text: 'let a = 1', language: 'ts' },
      { type: 'divider' },
      { type: 'math', text: 'E = mc^2' },
      { type: 'footer', text: 'fin' },
    ])
    expect(c.text).toBe('x\nlet a = 1\n———\nE = mc^2\nfin')
    expect(c.entities).toContainEqual({ type: 'pre', offset: 2, length: 9, language: 'ts' })
    expect(c.entities).toContainEqual({ type: 'italic', offset: 25, length: 3 })
  })

  it('drops leading, trailing and doubled dividers', () => {
    const c = conv([{ type: 'divider' }, p('a'), { type: 'divider' }, { type: 'divider' }, p('b'), { type: 'divider' }])
    expect(c.rich?.blocks.map((b) => b.type)).toEqual(['paragraph', 'divider', 'paragraph'])
  })

  it('table: header, align, colspan, compact, caption, row cap', () => {
    const cells = [
      [{ text: 'Name', is_header: true }, { text: 'Qty', is_header: true, align: 'right' }],
      [{ text: { type: 'bold', text: 'Apple' } }, { text: '3', colspan: 2 }],
      ...Array.from({ length: 14 }, () => [{ text: 'r' }, {}]),
    ]
    const c = conv([{ type: 'table', cells, is_compact: true, caption: 'Fruit' }])
    const t = c.rich?.blocks[0] as Extract<NonNullable<typeof c.rich>['blocks'][number], { type: 'table' }>
    expect(t.compact).toBe(true)
    expect(t.caption).toEqual({ text: 'Fruit' })
    expect(t.rows).toHaveLength(RICH_LIMITS.tableRows)
    expect(t.more).toBe(16 - RICH_LIMITS.tableRows)
    expect(t.rows[0]).toEqual([{ text: 'Name', header: true }, { text: 'Qty', header: true, align: 'right' }])
    expect(t.rows[1]).toEqual([{ text: 'Apple', entities: [{ type: 'bold', offset: 0, length: 5 }] }, { text: '3', span: 2 }])
    expect(t.rows[2]![1]).toEqual({ text: '' })
    expect(c.text.split('\n').slice(0, 2)).toEqual(['Name | Qty', 'Apple | 3'])
    expect(c.entities[0]).toEqual({ type: 'bold', offset: 0, length: 10 })
  })

  it('details and thinking stay collapsed; thinking falls back to the localized label', () => {
    const labels = { ...DEFAULT_LABELS, richThinking: 'Думаю…' }
    const c = convertRichMessage(
      {
        blocks: [
          { type: 'details', summary: 'More', blocks: [p('hidden')], is_open: true },
          { type: 'thinking' },
          { type: 'thinking', text: 'Searching' },
        ],
      },
      labels,
    )
    expect(c.rich?.blocks).toEqual([
      { type: 'details', text: 'More', open: true },
      { type: 'thinking', text: 'Думаю…' },
      { type: 'thinking', text: 'Searching' },
    ])
    expect(c.text).toBe('▸ More\n💭 Думаю…\n💭 Searching')
  })

  it('map / audio / voice / document become labeled lines; buttons and anchors vanish', () => {
    const c = conv([
      { type: 'map', location: { latitude: 1, longitude: 2 } },
      { type: 'audio', audio: { title: 'Song', performer: 'Band' } },
      { type: 'voice_note', voice_note: { duration: 3 } },
      { type: 'document', document: { file_name: 'a.pdf' } },
      { type: 'buttons' },
      { type: 'anchor' },
    ])
    expect(c.rich?.blocks).toEqual([
      { type: 'label', text: '📍 Location' },
      { type: 'label', text: '🎵 Band — Song' },
      { type: 'label', text: '🎤 Voice message' },
      { type: 'label', text: '📎 a.pdf' },
    ])
  })

  it('lifts media (also from collages) out of the blocks; media-only has no rich payload', () => {
    const c = conv([photo('a'), { type: 'collage', blocks: [photo('b'), p('ignored')] }])
    expect(c.rich).toBeUndefined()
    expect(c.text).toBe('')
    expect(c.media.map((m) => m.photo?.[0]?.file_id)).toEqual(['a', 'b'])
  })

  it('carries the RTL flag', () => {
    expect(conv([p('שלום')], { is_rtl: true }).rich?.rtl).toBe(true)
  })

  it('caps block count and fallback length', () => {
    const many = Array.from({ length: 100 }, (_, i) => p(`p${i} ${'x'.repeat(100)}`))
    const c = conv(many)
    expect(c.rich?.blocks).toHaveLength(RICH_LIMITS.blocks)
    expect(c.text.length).toBeLessThanOrEqual(RICH_LIMITS.fallbackText)
    expect(c.text.endsWith('…')).toBe(true)
  })

  it('caps a single huge paragraph', () => {
    const c = conv([p('y'.repeat(10000))])
    expect((c.rich?.blocks[0] as { text: string }).text.length).toBe(RICH_LIMITS.blockText)
  })

  it('ignores unknown block types and malformed input', () => {
    expect(conv([{ type: 'hologram' } as RichBlock, null as never]).rich).toBeUndefined()
    expect(convertRichMessage({} as RichMessage).text).toBe('')
  })
})

describe('fallbackOf', () => {
  it('prefixes list items by depth and keeps item entities shifted', () => {
    const f = fallbackOf({ type: 'list', ordered: false, items: [{ text: 'b', entities: [{ type: 'bold', offset: 0, length: 1 }], depth: 1 }] })
    expect(f).toEqual({ text: '  • b', entities: [{ type: 'bold', offset: 4, length: 1 }] })
  })
})

describe('applyRich / build-message integration', () => {
  const build = (source: Parameters<typeof buildQuoteMessage>[0]['source']) =>
    buildQuoteMessage({
      source,
      from: alice,
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })

  it('fills rich + fallback text for a rich message', () => {
    const m = build({ rich_message: { blocks: [{ type: 'heading', size: 1, text: 'Hi' }, p('there')] } })
    expect(m.rich?.blocks).toHaveLength(2)
    expect(m.text).toBe('Hi\nthere')
    expect(m.entities).toEqual([{ type: 'bold', offset: 0, length: 2 }])
  })

  it('first media block becomes the bubble media; several become an album', () => {
    const one = build({ rich_message: { blocks: [photo('a', true), p('cap')] } })
    expect(one.mediaType).toBe('photo')
    expect(one.media?.[0]?.file_id).toBe('a')
    expect(one.hasMediaSpoiler).toBe(true)
    expect(one.mediaCrop).toBeUndefined()

    const many = build({
      rich_message: {
        blocks: [
          { type: 'slideshow', blocks: [photo('a'), photo('b')] },
          { type: 'video', video: { file_id: 'v', thumbnail: { file_id: 't', file_unique_id: 't', width: 10, height: 10 }, duration: 5 } },
          p('x'),
        ],
      },
    })
    expect(many.album?.map((i) => i.file_id)).toEqual(['a', 'b', 't'])
    expect(many.album?.[2]).toMatchObject({ type: 'video', duration: 5 })
  })

  it('keeps the message own media over rich media', () => {
    const out: QuoteMessage = { media: [{ file_id: 'own' }], mediaType: 'photo' }
    applyRich(out, { rich_message: { blocks: [photo('rich'), p('t')] } })
    expect(out.media?.[0]?.file_id).toBe('own')
  })

  it('a manual selection wins over the rich body', () => {
    const m = build({ rich_message: { blocks: [p('full text')] }, selection: { text: 'full' } })
    expect(m.rich).toBeUndefined()
    expect(m.text).toBe('full')
  })

  it('media-only rich message renders the media, not "unsupported"', () => {
    const m = build({ rich_message: { blocks: [photo('a')] } })
    expect(m.media?.[0]?.file_id).toBe('a')
    expect(m.text).toBeUndefined()
  })

  it('a reply to a rich message previews its first line', () => {
    const r = buildReplyMessage({ rich_message: { blocks: [{ type: 'divider' }, { type: 'heading', text: 'Plan' }, p('x')] } }, alice)
    expect(r.text).toBe('Plan')
  })

  it('hasRichContent', () => {
    expect(hasRichContent({ rich_message: { blocks: [p('a')] } })).toBe(true)
    expect(hasRichContent({ rich_message: { blocks: [] } })).toBe(false)
    expect(hasRichContent({ text: 'a' })).toBe(false)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { albumItem, expandAlbums, mergeAlbums } from './album'
import { selectSourceMessages } from './select'
import { buildQuoteMessage } from './build-message'
import type { RawMessage } from './assemble'
import type { ApiMessage } from '../../services/bot-api'

const photo = (id: number, gid = 'g1', extra: Record<string, unknown> = {}): RawMessage =>
  ({
    message_id: id,
    media_group_id: gid,
    photo: [
      { file_id: `s${id}`, width: 90, height: 60 },
      { file_id: `l${id}`, width: 1280, height: 853 },
    ],
    ...extra,
  }) as unknown as RawMessage
const video = (id: number, gid = 'g1'): RawMessage =>
  ({
    message_id: id,
    media_group_id: gid,
    video: { file_id: `v${id}`, duration: 12, width: 1920, height: 1080, thumbnail: { file_id: `t${id}`, width: 320, height: 180 } },
  }) as unknown as RawMessage

describe('albumItem', () => {
  it('picks the largest photo size', () => {
    expect(albumItem(photo(1))).toEqual({ file_id: 'l1', width: 1280, height: 853, type: 'photo' })
  })
  it('uses the thumbnail for a video and keeps its duration', () => {
    expect(albumItem(video(2))).toEqual({ file_id: 't2', width: 320, height: 180, type: 'video', duration: 12 })
  })
})

describe('mergeAlbums', () => {
  it('merges members into one message with the caption holder as base', () => {
    const out = mergeAlbums([photo(5), photo(6, 'g1', { caption: 'hi', caption_entities: [{ type: 'bold', offset: 0, length: 2 }] }), video(7)])
    expect(out).toHaveLength(1)
    const m = out[0]!
    expect(m.caption).toBe('hi')
    expect(m.caption_entities).toHaveLength(1)
    expect(m.message_id).toBe(5)
    expect(m.photo).toBeUndefined()
    expect(m.album?.map((i) => i.type)).toEqual(['photo', 'photo', 'video'])
  })

  it('does not render the other items separately in a range', () => {
    const text = { message_id: 4, text: 'before' } as unknown as RawMessage
    const out = mergeAlbums([text, photo(5), photo(6), { message_id: 8, text: 'after' } as unknown as RawMessage])
    expect(out.map((m) => m.message_id)).toEqual([4, 5, 8])
  })

  it('keeps separate albums separate and caps at 10', () => {
    const many = Array.from({ length: 12 }, (_, i) => photo(i + 1))
    const out = mergeAlbums([...many, photo(30, 'g2'), photo(31, 'g2')])
    expect(out).toHaveLength(2)
    expect(out[0]!.album).toHaveLength(10)
    expect(out[1]!.album).toHaveLength(2)
  })

  it('leaves a lone item and non-album messages untouched', () => {
    const lone = photo(1)
    expect(mergeAlbums([lone])).toEqual([lone])
    const doc = { message_id: 2, media_group_id: 'g', document: { file_id: 'd' } } as unknown as RawMessage
    expect(mergeAlbums([doc, { ...doc, message_id: 3 }])).toHaveLength(2)
  })

  it('carries a manual selection onto the merged message', () => {
    const out = mergeAlbums([photo(5, 'g1', { selection: { text: 'x' } }), photo(6)])
    expect(out[0]!.selection?.text).toBe('x')
  })
})

describe('expandAlbums / select', () => {
  const fetcherFor = (all: RawMessage[]) => ({
    isHealthy: () => true,
    getMessages: vi.fn(async (_c: number, ids: number[]) => all.filter((m) => ids.includes(m.message_id!)) as unknown as ApiMessage[]),
  })

  it('fetches a ±9 window and keeps only the same group, in id order', async () => {
    const f = fetcherFor([photo(98), photo(100), photo(101, 'other'), photo(102), { message_id: 103, text: 'x' } as unknown as RawMessage])
    const out = await expandAlbums([photo(100)], -1, f)
    expect(out.map((m) => m.message_id)).toEqual([98, 100, 102])
    const ids = f.getMessages.mock.calls[0]![1]
    expect(Math.min(...ids)).toBe(91)
    expect(Math.max(...ids)).toBe(109)
    expect(ids).not.toContain(100)
  })

  it('a single replied album item becomes the whole album', async () => {
    const f = fetcherFor([photo(100), photo(101), photo(102, 'g1', { caption: 'cap' })])
    const sel = await selectSourceMessages({
      trigger: { message_id: 200, text: '/q', reply_to_message: photo(101) as never },
      chatId: -1,
      isPrivate: false,
      isGuest: false,
      count: 1,
      fetcher: f,
    })
    expect(sel.messages.map((m) => m.message_id)).toEqual([100, 101, 102])
    expect(mergeAlbums(sel.messages)).toHaveLength(1)
  })

  it('survives a failing fetch', async () => {
    const f = { isHealthy: () => true, getMessages: vi.fn(async () => { throw new Error('boom') }) }
    const out = await expandAlbums([photo(100)], -1, f)
    expect(out).toHaveLength(1)
  })
})

describe('buildQuoteMessage with an album', () => {
  it('emits album + caption and no single media', () => {
    const [merged] = mergeAlbums([photo(5), photo(6, 'g1', { caption: 'cap' })])
    const out = buildQuoteMessage({
      source: merged!,
      from: { id: 1, first_name: 'A' },
      isFirstInStreak: true,
      showReply: false,
      crop: false,
      forceMedia: false,
      unsupportedText: 'unsupported',
    })
    expect(out.text).toBe('cap')
    expect(out.album).toHaveLength(2)
    expect(out.media).toBeUndefined()
  })

  it('album-only message is not "unsupported"', () => {
    const [merged] = mergeAlbums([photo(5), photo(6)])
    const out = buildQuoteMessage({
      source: merged!,
      from: { id: 1, first_name: 'A' },
      isFirstInStreak: true,
      showReply: false,
      crop: false,
      forceMedia: false,
      unsupportedText: 'unsupported',
    })
    expect(out.text).toBeUndefined()
  })
})

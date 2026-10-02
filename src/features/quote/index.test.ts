import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'
import type { BotContext } from '../../core/types'
import type { RawMessage } from './assemble'

// Heavy collaborators are stubbed; the real send.ts runs so we can observe the
// reply markup that actually reaches the chat.
vi.mock('./assemble', () => ({
  assembleQuoteMessages: vi.fn(async () => ({ messages: [{ from: { id: 1, name: 'A' } }], privacy: [] })),
}))
vi.mock('./persist', () => ({ persistQuote: vi.fn() }))
vi.mock('../../db/repositories/group-repository', () => ({ incrementQuoteCounter: vi.fn(async () => 5) }))
vi.mock('../../services/quote-api/client', () => ({ generateQuote: vi.fn() }))

import { renderQuote } from './index'
import { parseQuoteArgs } from './parse-args'
import { generateQuote } from '../../services/quote-api/client'
import { incrementQuoteCounter } from '../../db/repositories/group-repository'
import { assembleQuoteMessages } from './assemble'

/** Minimal valid PNG header (signature + IHDR) with the given dimensions. */
function png(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24)
  buf.writeUInt32BE(0x89504e47, 0)
  buf.writeUInt32BE(0x0d0a1a0a, 4)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12)
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

function groupCtx(): {
  ctx: BotContext
  replyWithSticker: ReturnType<typeof vi.fn>
  replyWithPhoto: ReturnType<typeof vi.fn>
} {
  const replyWithSticker = vi.fn(async () => ({ sticker: { file_id: 'sid', file_unique_id: 'suid' } }))
  const replyWithPhoto = vi.fn(async () => ({}))
  const ctx = {
    chat: { id: -100, type: 'supergroup' },
    from: { id: 7, language_code: 'en' },
    me: { id: 99, username: 'testbot' },
    group: { _id: new Types.ObjectId(), settings: { rate: true } },
    user: undefined,
    t: (k: string) => k,
    logger: { debug: vi.fn(), warn: vi.fn() },
    api: {},
    replyWithSticker,
    replyWithPhoto,
    replyWithDocument: vi.fn(async () => ({})),
  } as unknown as BotContext
  return { ctx, replyWithSticker, replyWithPhoto }
}

const sources = [{ message_id: 1 } as unknown as RawMessage]

describe('renderQuote reply markup', () => {
  beforeEach(() => {
    vi.mocked(incrementQuoteCounter).mockClear()
  })

  it('attaches rate/deep-link buttons to a sticker quote in a group', async () => {
    const { ctx, replyWithSticker } = groupCtx()
    vi.mocked(generateQuote).mockResolvedValue({ image: Buffer.from('webp'), quoteType: 'quote' } as never)

    await renderQuote(ctx, sources, parseQuoteArgs(''), { isGuest: false, replyToId: 1 })

    expect(replyWithSticker).toHaveBeenCalledTimes(1)
    expect(replyWithSticker.mock.calls[0]![1].reply_markup).toBeDefined()
    expect(incrementQuoteCounter).toHaveBeenCalledTimes(1)
  })

  it('sends an image quote (/q i) with no buttons and mints no local id', async () => {
    const { ctx, replyWithPhoto } = groupCtx()
    vi.mocked(generateQuote).mockResolvedValue({ image: png(614, 900), quoteType: 'image' } as never)

    await renderQuote(ctx, sources, parseQuoteArgs('img'), { isGuest: false, replyToId: 1 })

    expect(replyWithPhoto).toHaveBeenCalledTimes(1)
    // Dead 👍/👎 + "Open in app" buttons on a non-persisted render were the bug.
    expect(replyWithPhoto.mock.calls[0]![1].reply_markup).toBeUndefined()
    // No dangling local_id: the per-group counter isn't bumped for non-sticker output.
    expect(incrementQuoteCounter).not.toHaveBeenCalled()
  })
})

describe('renderQuote default format', () => {
  it("ignores the caller's personal format in a group that has none set", async () => {
    const { ctx, replyWithSticker, replyWithPhoto } = groupCtx()
    ctx.user = { settings: { quote: { format: 'image' } } } as never
    vi.mocked(generateQuote).mockResolvedValue({ image: Buffer.from('webp'), quoteType: 'quote' } as never)

    await renderQuote(ctx, sources, parseQuoteArgs(''), { isGuest: false, replyToId: 1 })

    expect(vi.mocked(generateQuote).mock.calls.at(-1)![0].type).toBe('quote')
    expect(replyWithSticker).toHaveBeenCalledTimes(1)
    expect(replyWithPhoto).not.toHaveBeenCalled()
  })

  it("applies the group's own format", async () => {
    const { ctx, replyWithPhoto } = groupCtx()
    ctx.group!.settings!.quote = { format: 'image' } as never
    vi.mocked(generateQuote).mockResolvedValue({ image: png(614, 900), quoteType: 'image' } as never)

    await renderQuote(ctx, sources, parseQuoteArgs(''), { isGuest: false, replyToId: 1 })

    expect(vi.mocked(generateQuote).mock.calls.at(-1)![0].type).toBe('image')
    expect(replyWithPhoto).toHaveBeenCalledTimes(1)
  })
})

describe('renderQuote original author role lookup', () => {
  it.each([
    { status: 'creator', custom_title: 'Owner', expected: 'Owner' },
    { status: 'administrator', custom_title: 'Admin', expected: 'Admin' },
    { status: 'member', tag: 'Member role', expected: 'Member role' },
    { status: 'restricted', is_member: true, tag: 'Restricted role', expected: 'Restricted role' },
    { status: 'restricted', is_member: false, tag: 'Old role', expected: undefined },
    { status: 'left', expected: undefined },
    { status: 'kicked', expected: undefined },
    { status: 'administrator', expected: undefined },
  ])('reads author role for $status and caches it within the quote', async ({ expected, ...member }) => {
    const { ctx } = groupCtx()
    const getChatMember = vi.fn(async () => member)
    ctx.api.getChatMember = getChatMember as never
    vi.mocked(generateQuote).mockResolvedValue({ image: Buffer.from('webp'), quoteType: 'quote' } as never)
    await renderQuote(ctx, sources, parseQuoteArgs(''), { isGuest: false, replyToId: 1 })
    const deps = vi.mocked(assembleQuoteMessages).mock.calls.at(-1)![1]
    expect(await deps.getAuthorTag(2)).toBe(expected)
    expect(await deps.getAuthorTag(2)).toBe(expected)
    expect(getChatMember).toHaveBeenCalledExactlyOnceWith(-100, 2)
  })

  it('returns no role when Telegram cannot resolve the author', async () => {
    const { ctx } = groupCtx()
    const getChatMember = vi.fn(async () => { throw new Error('Not found') })
    ctx.api.getChatMember = getChatMember as never
    vi.mocked(generateQuote).mockResolvedValue({ image: Buffer.from('webp'), quoteType: 'quote' } as never)
    await renderQuote(ctx, sources, parseQuoteArgs(''), { isGuest: false, replyToId: 1 })
    const deps = vi.mocked(assembleQuoteMessages).mock.calls.at(-1)![1]
    expect(await deps.getAuthorTag(2)).toBeUndefined()
    expect(await deps.getAuthorTag(2)).toBeUndefined()
    expect(getChatMember).toHaveBeenCalledTimes(1)
  })
})

describe('renderQuote tall-quote fallback (B5)', () => {
  beforeEach(() => {
    vi.mocked(incrementQuoteCounter).mockClear()
  })

  it('sends a >2048px quote (png fallback) as a photo, not a sticker, without buttons or persistence', async () => {
    const { ctx, replyWithSticker, replyWithPhoto } = groupCtx()
    vi.mocked(generateQuote).mockResolvedValue({ image: png(1024, 4200), quoteType: 'png' } as never)

    await renderQuote(ctx, sources, parseQuoteArgs(''), { isGuest: false, replyToId: 1 })

    expect(replyWithSticker).not.toHaveBeenCalled()
    expect(replyWithPhoto).toHaveBeenCalledTimes(1)
    expect(replyWithPhoto.mock.calls[0]![1].reply_markup).toBeUndefined()
  })

  it('sends it as a document when the png also exceeds photo dimension limits', async () => {
    const { ctx, replyWithSticker, replyWithPhoto } = groupCtx()
    vi.mocked(generateQuote).mockResolvedValue({ image: png(1024, 30_000), quoteType: 'png' } as never)

    await renderQuote(ctx, sources, parseQuoteArgs(''), { isGuest: false, replyToId: 1 })

    expect(replyWithSticker).not.toHaveBeenCalled()
    expect(replyWithPhoto).not.toHaveBeenCalled()
    expect(ctx.replyWithDocument).toHaveBeenCalledTimes(1)
  })
})

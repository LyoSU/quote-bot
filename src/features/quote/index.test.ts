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

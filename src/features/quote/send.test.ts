import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InlineKeyboard } from 'grammy'
import { sendQuote, type SendQuoteParams } from './send'
import { stickerService } from '../../services/sticker'
import type { BotContext } from '../../core/types'

vi.mock('../../services/sticker', () => ({
  packName: (base: string, botUsername: string): string => `${base}${botUsername}`,
  stickerService: {
    addSticker: vi.fn(async () => {}),
    scheduleTrim: vi.fn(),
  },
}))

interface GuestCtxOptions {
  from?: { id: number; first_name: string; is_bot: boolean }
}

/** Minimal guest-mode context: the incoming guest_message carries the caller in `from`. */
function guestCtx(opts: GuestCtxOptions = {}): {
  ctx: BotContext
  answerGuestQuery: ReturnType<typeof vi.fn>
  getStickerSet: ReturnType<typeof vi.fn>
} {
  const answerGuestQuery = vi.fn(async () => ({}))
  const getStickerSet = vi.fn(async () => ({
    stickers: [{ file_id: 'fid', file_unique_id: 'fuid' }],
  }))
  const ctx = {
    guestMessage: {
      message_id: 1,
      date: 0,
      guest_query_id: 'gq1',
      chat: { id: 777, type: 'private' },
      ...('from' in opts ? { from: opts.from } : { from: { id: 42, first_name: 'Caller', is_bot: false } }),
    },
    me: { id: 99, username: 'testbot' },
    api: { getStickerSet },
    answerGuestQuery,
    logger: { debug: vi.fn(), warn: vi.fn() },
    t: (key: string) => key,
  } as unknown as BotContext
  return { ctx, answerGuestQuery, getStickerSet }
}

function params(ctx: BotContext): SendQuoteParams {
  return {
    ctx,
    image: Buffer.from('webp'),
    delivery: 'sticker',
    emojis: ['💬'],
    replyMarkup: { reply_markup: new InlineKeyboard().text('👍 0', 'x') },
    presetId: 'preset1',
  }
}

describe('sendQuote (guest mode)', () => {
  beforeEach(() => {
    vi.mocked(stickerService.addSticker).mockClear()
    vi.mocked(stickerService.addSticker).mockResolvedValue(undefined)
  })

  it('stages the sticker for the summoning user (guest_message.from) and answers the query', async () => {
    const { ctx, answerGuestQuery } = guestCtx()

    const result = await sendQuote(params(ctx))

    expect(result.sent).toBe(true)
    expect(result.fileId).toBe('fid')
    expect(stickerService.addSticker).toHaveBeenCalledWith(
      ctx.api,
      expect.objectContaining({ ownerId: 42 }),
    )
    expect(answerGuestQuery).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sticker', sticker_file_id: 'fid', id: 'preset1' }),
    )
  })

  it('falls back to the "open in PM" article when staging fails', async () => {
    const { ctx, answerGuestQuery } = guestCtx()
    vi.mocked(stickerService.addSticker).mockRejectedValueOnce(new Error('PEER_ID_INVALID'))

    const result = await sendQuote(params(ctx))

    expect(result.sent).toBe(false)
    expect(answerGuestQuery).toHaveBeenCalledWith(expect.objectContaining({ type: 'article', id: 'pm' }))
  })

  it('never goes silent: answers the article fallback even without a resolvable caller', async () => {
    const { ctx, answerGuestQuery } = guestCtx({ from: undefined })

    const result = await sendQuote(params(ctx))

    expect(result.sent).toBe(false)
    expect(answerGuestQuery).toHaveBeenCalledWith(expect.objectContaining({ type: 'article', id: 'pm' }))
  })
})

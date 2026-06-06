import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InlineKeyboard } from 'grammy'
import { sendQuote, type SendQuoteParams } from './send'
import { stickerService } from '../../services/sticker'
import type { BotContext } from '../../core/types'

vi.mock('../../services/sticker', () => ({
  packName: (base: string, botUsername: string): string => `${base}${botUsername}`,
  stickerService: {
    stageSticker: vi.fn(async () => ({ file_id: 'fid', file_unique_id: 'fuid' })),
    discardSticker: vi.fn(),
  },
}))

interface GuestCtxOptions {
  from?: { id: number; first_name: string; is_bot: boolean }
}

/** Minimal guest-mode context: the incoming guest_message carries the caller in `from`. */
function guestCtx(opts: GuestCtxOptions = {}): {
  ctx: BotContext
  answerGuestQuery: ReturnType<typeof vi.fn>
} {
  const answerGuestQuery = vi.fn(async () => ({}))
  const ctx = {
    guestMessage: {
      message_id: 1,
      date: 0,
      guest_query_id: 'gq1',
      chat: { id: 777, type: 'private' },
      ...('from' in opts ? { from: opts.from } : { from: { id: 42, first_name: 'Caller', is_bot: false } }),
    },
    me: { id: 99, username: 'testbot' },
    api: {},
    answerGuestQuery,
    logger: { debug: vi.fn(), warn: vi.fn() },
    t: (key: string) => key,
  } as unknown as BotContext
  return { ctx, answerGuestQuery }
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
    vi.mocked(stickerService.stageSticker).mockClear()
    vi.mocked(stickerService.stageSticker).mockResolvedValue({ file_id: 'fid', file_unique_id: 'fuid' } as never)
    vi.mocked(stickerService.discardSticker).mockClear()
  })

  it('stages the sticker for the summoning user (guest_message.from) and answers the query', async () => {
    const { ctx, answerGuestQuery } = guestCtx()

    const result = await sendQuote(params(ctx))

    expect(result.sent).toBe(true)
    expect(result.fileId).toBe('fid')
    expect(stickerService.stageSticker).toHaveBeenCalledWith(
      ctx.api,
      expect.objectContaining({ ownerId: 42 }),
    )
    expect(answerGuestQuery).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sticker', sticker_file_id: 'fid', id: 'preset1' }),
    )
  })

  it('discards the staged sticker right after answering (privacy)', async () => {
    const { ctx, answerGuestQuery } = guestCtx()

    await sendQuote(params(ctx))

    expect(stickerService.discardSticker).toHaveBeenCalledWith(ctx.api, 'g42_by_testbot', 'fid')
    // discard happens only after the answer went out
    const answerOrder = answerGuestQuery.mock.invocationCallOrder[0] ?? 0
    const discardOrder = vi.mocked(stickerService.discardSticker).mock.invocationCallOrder[0] ?? 0
    expect(discardOrder).toBeGreaterThan(answerOrder)
  })

  it('discards the staged sticker even when the answer fails', async () => {
    const { ctx, answerGuestQuery } = guestCtx()
    answerGuestQuery.mockRejectedValueOnce(new Error('QUERY_ID_INVALID'))

    const result = await sendQuote(params(ctx))

    expect(result.sent).toBe(false)
    expect(stickerService.discardSticker).toHaveBeenCalledWith(ctx.api, 'g42_by_testbot', 'fid')
  })

  it('falls back to the "open in PM" article when staging fails, without discarding', async () => {
    const { ctx, answerGuestQuery } = guestCtx()
    vi.mocked(stickerService.stageSticker).mockRejectedValueOnce(new Error('PEER_ID_INVALID'))

    const result = await sendQuote(params(ctx))

    expect(result.sent).toBe(false)
    expect(answerGuestQuery).toHaveBeenCalledWith(expect.objectContaining({ type: 'article', id: 'pm' }))
    expect(stickerService.discardSticker).not.toHaveBeenCalled()
  })

  it('never goes silent: answers the article fallback even without a resolvable caller', async () => {
    const { ctx, answerGuestQuery } = guestCtx({ from: undefined })

    const result = await sendQuote(params(ctx))

    expect(result.sent).toBe(false)
    expect(answerGuestQuery).toHaveBeenCalledWith(expect.objectContaining({ type: 'article', id: 'pm' }))
  })
})

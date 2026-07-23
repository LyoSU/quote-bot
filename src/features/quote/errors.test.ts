import { describe, expect, it, vi } from 'vitest'
import { GrammyError } from 'grammy'
import { handleQuoteError } from './errors'
import { QuoteApiError } from '../../services/quote-api/client'
import type { BotContext } from '../../core/types'

function ctx(): { ctx: BotContext; reply: ReturnType<typeof vi.fn> } {
  const reply = vi.fn(async () => ({}))
  return {
    ctx: {
      reply,
      t: (key: string) => key,
      logger: { debug: vi.fn(), warn: vi.fn() },
    } as unknown as BotContext,
    reply,
  }
}

function tg429(): GrammyError {
  return new GrammyError(
    "Call to 'sendMessage' failed!",
    { ok: false, error_code: 429, description: 'Too Many Requests: retry after 34' },
    'sendMessage',
    {},
  )
}

describe('handleQuoteError', () => {
  it('does not reply into a rate-limited chat — the reply would just 429 too', async () => {
    const { ctx: c, reply } = ctx()

    await handleQuoteError(c, tg429())

    expect(reply).not.toHaveBeenCalled()
  })

  it('replies with a mapped message for other Telegram errors', async () => {
    const { ctx: c, reply } = ctx()
    const err = new GrammyError(
      "Call to 'sendSticker' failed!",
      { ok: false, error_code: 400, description: 'Bad Request: something odd' },
      'sendSticker',
      {},
    )

    await handleQuoteError(c, err)

    expect(reply).toHaveBeenCalledWith('quote-errors-telegram_error', expect.anything())
  })

  it('still replies on renderer backpressure (429 from quote-api, not from the chat)', async () => {
    const { ctx: c, reply } = ctx()

    await handleQuoteError(c, new QuoteApiError('busy', 429))

    expect(reply).toHaveBeenCalledWith('quote-errors-rate_limit', expect.anything())
  })
})

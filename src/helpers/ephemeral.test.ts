import { describe, expect, it, vi } from 'vitest'
import type { BotContext } from '../core/types'
import { editPanelText, replyEphemeral, replyPrivately } from './ephemeral'

const group = { id: -100, type: 'supergroup' as const }
const from = { id: 42 }

function ctxWith(over: Record<string, unknown>): BotContext {
  return {
    from,
    reply: vi.fn().mockResolvedValue({}),
    editMessageText: vi.fn().mockResolvedValue(true),
    api: { editEphemeralMessageText: vi.fn().mockResolvedValue(true) },
    ...over,
  } as unknown as BotContext
}

describe('replyEphemeral', () => {
  it('answers an ephemeral command within its reply window, to the sender only', async () => {
    const ctx = ctxWith({ message: { chat: group, message_id: 0, ephemeral_message_id: 7 } })
    expect(await replyEphemeral(ctx, 'hi', {})).toBe(true)
    expect(ctx.reply).toHaveBeenCalledWith('hi', {
      ephemeral_message_parameters: { receiver_user_id: 42 },
      reply_parameters: { ephemeral_message_id: 7 },
    })
  })

  it('answers a plain command the regular way — its app may not show ephemeral messages', async () => {
    const ctx = ctxWith({ message: { chat: group, message_id: 5 } })
    expect(await replyEphemeral(ctx, 'hi', {})).toBe(false)
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('reports failure (reply window missed) so the caller falls back', async () => {
    const ctx = ctxWith({
      message: { chat: group, message_id: 0, ephemeral_message_id: 7 },
      reply: vi.fn().mockRejectedValue(new Error('400')),
    })
    expect(await replyEphemeral(ctx, 'hi', {})).toBe(false)
  })

  it('skips private chats', async () => {
    const ctx = ctxWith({ message: { chat: { id: 42, type: 'private' }, message_id: 5 } })
    expect(await replyEphemeral(ctx, 'hi', {})).toBe(false)
    expect(ctx.reply).not.toHaveBeenCalled()
  })
})

describe('editPanelText', () => {
  it('edits an ephemeral panel through the ephemeral method', async () => {
    const ctx = ctxWith({ callbackQuery: { message: { chat: group, message_id: 0, ephemeral_message_id: 9 } } })
    await editPanelText(ctx, 'x', {})
    expect(ctx.api.editEphemeralMessageText).toHaveBeenCalledWith(-100, 42, 9, 'x', {})
    expect(ctx.editMessageText).not.toHaveBeenCalled()
  })

  it('edits a regular message the regular way', async () => {
    const ctx = ctxWith({ callbackQuery: { message: { chat: group, message_id: 3 } } })
    await editPanelText(ctx, 'x', {})
    expect(ctx.editMessageText).toHaveBeenCalledWith('x', {})
  })
})

describe('replyPrivately', () => {
  it('falls back to a public reply when the ephemeral window was missed', async () => {
    const reply = vi.fn().mockRejectedValueOnce(new Error('400')).mockResolvedValue({})
    const ctx = ctxWith({ message: { chat: group, message_id: 0, ephemeral_message_id: 7 }, reply })
    await replyPrivately(ctx, 'hi', {})
    expect(reply).toHaveBeenCalledTimes(2)
    expect(reply).toHaveBeenLastCalledWith('hi', {}) // message_id 0: nothing to reply to
  })

  it('replies to a plain command as before', async () => {
    const ctx = ctxWith({ message: { chat: group, message_id: 5 } })
    await replyPrivately(ctx, 'hi', {})
    expect(ctx.reply).toHaveBeenCalledExactlyOnceWith('hi', { reply_parameters: { message_id: 5, allow_sending_without_reply: true } })
  })
})

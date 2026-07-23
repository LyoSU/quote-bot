import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pmBatcher } from './pm-batch'
import { parseQuoteArgs } from './parse-args'
import type { BotContext } from '../../core/types'
import type { RawMessage } from './assemble'

type Flag = ReturnType<typeof parseQuoteArgs>
const mkRender = () => vi.fn((_c: BotContext, _s: RawMessage[], _f: Flag) => Promise.resolve())

const ctx = (chatId: number) => ({ chat: { id: chatId, type: 'private' } }) as unknown as BotContext
const fwd = (id: number, text = `m${id}`): RawMessage =>
  ({ message_id: id, text, forward_origin: { type: 'user', sender_user: { id: 1 } } }) as unknown as RawMessage
const plain = (id: number): RawMessage => ({ message_id: id, text: 'hi' }) as unknown as RawMessage
const album = (id: number, gid: string): RawMessage =>
  ({ message_id: id, media_group_id: gid, photo: [{ file_id: `p${id}` }] }) as unknown as RawMessage

const flag0 = parseQuoteArgs('')

describe('pmBatcher', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders a single forward once after the debounce window', async () => {
    const render = mkRender()
    expect(pmBatcher.handle(ctx(10), fwd(1), flag0, render)).toBe(true)
    expect(render).not.toHaveBeenCalled() // buffered, not immediate
    await vi.advanceTimersByTimeAsync(700)
    expect(render).toHaveBeenCalledTimes(1)
    expect(render.mock.calls[0]![1]).toHaveLength(1)
  })

  it('merges a burst of forwards into one render', async () => {
    const render = mkRender()
    pmBatcher.handle(ctx(11), fwd(1), flag0, render)
    pmBatcher.handle(ctx(11), fwd(2), flag0, render)
    pmBatcher.handle(ctx(11), fwd(3), flag0, render)
    await vi.advanceTimersByTimeAsync(700)
    expect(render).toHaveBeenCalledTimes(1)
    expect(render.mock.calls[0]![1].map((m) => m.message_id)).toEqual([1, 2, 3])
  })

  it('merges album parts sharing a media_group_id', async () => {
    const render = mkRender()
    pmBatcher.handle(ctx(12), album(1, 'g'), flag0, render)
    pmBatcher.handle(ctx(12), album(2, 'g'), flag0, render)
    await vi.advanceTimersByTimeAsync(700)
    expect(render).toHaveBeenCalledTimes(1)
    expect(render.mock.calls[0]![1]).toHaveLength(2)
  })

  it('flushes a pending batch early when /q arrives, applying its flags', async () => {
    const render = mkRender()
    pmBatcher.handle(ctx(13), fwd(1), flag0, render)
    const rated = parseQuoteArgs('rate')
    // The /q command message itself is not added to the batch.
    const handled = pmBatcher.handle(ctx(13), { message_id: 2, text: '/q rate' } as RawMessage, rated, render)
    expect(handled).toBe(true)
    expect(render).toHaveBeenCalledTimes(1)
    expect(render.mock.calls[0]![1]).toHaveLength(1) // just the forward
    expect(render.mock.calls[0]![2].rate).toBe(true) // /q flags applied
    await vi.advanceTimersByTimeAsync(700)
    expect(render).toHaveBeenCalledTimes(1) // no double render
  })

  it('does not batch a plain typed message', () => {
    const render = mkRender()
    expect(pmBatcher.handle(ctx(14), plain(1), flag0, render)).toBe(false)
  })

  it('lets a lone /q fall through to normal handling', () => {
    const render = mkRender()
    expect(pmBatcher.handle(ctx(15), { message_id: 1, text: '/q' } as RawMessage, flag0, render)).toBe(false)
  })
})

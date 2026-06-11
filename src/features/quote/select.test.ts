import { describe, it, expect, vi } from 'vitest'
import { selectSourceMessages, type MessageFetcher, type SelectParams } from './select'
import type { ApiMessage } from '../../services/bot-api'

type Trigger = SelectParams['trigger']

function fetcher(messages: ApiMessage[], healthy = true): MessageFetcher {
  return { isHealthy: () => healthy, getMessages: vi.fn(async () => messages) }
}

const reply = { message_id: 10, text: 'hi', from: { id: 1, first_name: 'A' } }
const trigger = (over: Partial<Trigger> = {}): Trigger => ({
  message_id: 20,
  text: '/q',
  from: { id: 2, first_name: 'B' },
  ...over,
})

describe('selectSourceMessages', () => {
  it('quotes the replied message for count 1', async () => {
    const sel = await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: 1,
      fetcher: fetcher([]),
    })
    expect(sel.messages).toHaveLength(1)
    expect(sel.messages[0]?.message_id).toBe(10)
  })

  it('carries the partial-quote selection onto the replied message', async () => {
    const sel = await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply, quote: { text: 'part' } }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: 1,
      fetcher: fetcher([]),
    })
    expect(sel.messages[0]?.message_id).toBe(10)
    expect(sel.messages[0]?.selection?.text).toBe('part')
  })

  it("keeps the replied message's own reply-quote out of the selection", async () => {
    // The target itself was a reply-with-quote: its `quote` is a fragment of
    // ITS parent, not a selection of its own text.
    const sel = await selectSourceMessages({
      trigger: trigger({
        reply_to_message: { ...reply, quote: { text: 'parent fragment' } },
      }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: 1,
      fetcher: fetcher([]),
    })
    expect(sel.messages[0]?.selection).toBeUndefined()
    expect(sel.messages[0]?.quote?.text).toBe('parent fragment')
  })

  it('grafts the nested reply via the server when the r flag needs it', async () => {
    // Native updates never nest reply_to_message inside reply_to_message — the
    // reply flag must fetch the quoted message through the server.
    const nested = { message_id: 5, text: 'root', date: 0 }
    const td = fetcher([{ message_id: 10, text: 'hi', date: 0, reply_to_message: nested } as ApiMessage])
    const sel = await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: 1,
      needReply: true,
      fetcher: td,
    })
    expect(sel.messages).toHaveLength(1)
    expect(sel.messages[0]?.text).toBe('hi') // native message stays the base
    expect(sel.messages[0]?.reply_to_message?.message_id).toBe(5)
  })

  it('falls back to the native message when the reply fetch fails', async () => {
    const td: MessageFetcher = { isHealthy: () => true, getMessages: vi.fn(async () => { throw new Error('server down') }) }
    const sel = await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: 1,
      needReply: true,
      fetcher: td,
    })
    expect(sel.messages[0]?.message_id).toBe(10)
  })

  it('quotes the trigger itself in a private chat with no reply', async () => {
    const t = trigger()
    const sel = await selectSourceMessages({ trigger: t, chatId: 5, isPrivate: true, isGuest: false, fetcher: fetcher([]) })
    expect(sel.messages[0]?.message_id).toBe(20)
  })

  it('returns nothing for a group message with no reply', async () => {
    const sel = await selectSourceMessages({ trigger: trigger(), chatId: -1, isPrivate: false, isGuest: false, fetcher: fetcher([]) })
    expect(sel.messages).toHaveLength(0)
  })

  it('fetches a range via the server when count > 1 and healthy', async () => {
    const td = fetcher([
      { message_id: 10, date: 0 },
      { message_id: 11, date: 0 },
    ])
    const sel = await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: 2,
      fetcher: td,
    })
    expect(td.getMessages).toHaveBeenCalledWith(-100, [10, 11])
    expect(sel.messages).toHaveLength(2)
  })

  it('falls back to the native message when the server is unavailable', async () => {
    const sel = await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: 5,
      fetcher: fetcher([], false),
    })
    expect(sel.messages).toHaveLength(1)
    expect(sel.messages[0]?.message_id).toBe(10)
  })

  it('never calls the server in guest mode', async () => {
    const td = fetcher([])
    await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply }),
      chatId: 1,
      isPrivate: false,
      isGuest: true,
      count: 5,
      fetcher: td,
    })
    expect(td.getMessages).not.toHaveBeenCalled()
  })

  it('uses an external reply tagged with the trigger id', async () => {
    const sel = await selectSourceMessages({
      trigger: trigger({ external_reply: { text: 'from channel' }, quote: { text: 'q' } }),
      chatId: -1,
      isPrivate: false,
      isGuest: false,
      fetcher: fetcher([]),
    })
    expect(sel.messages[0]?.message_id).toBe(20)
    expect(sel.messages[0]?.text).toBe('from channel')
    expect(sel.messages[0]?.selection?.text).toBe('q')
  })

  it('quotes backwards for a negative count', async () => {
    const td = fetcher([{ message_id: 8, date: 0 }])
    await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: -3,
      fetcher: td,
    })
    // start = 10 - (3 - 1) = 8 → [8, 9, 10]
    expect(td.getMessages).toHaveBeenCalledWith(-100, [8, 9, 10])
  })

  it('attaches the selection to the replied message in a range fetch', async () => {
    const td = fetcher([
      { message_id: 10, date: 0 },
      { message_id: 11, date: 0 },
    ])
    const sel = await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply, quote: { text: 'part' } }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: 2,
      fetcher: td,
    })
    expect(sel.messages[0]?.selection?.text).toBe('part')
    expect(sel.messages[1]?.selection).toBeUndefined()
  })

  it('attaches the selection to the replied message in a backwards range', async () => {
    // Backwards from message 10: [8, 9, 10] — the replied message is LAST,
    // and the manual quote selection belongs to it, not to messages[0].
    const td = fetcher([
      { message_id: 8, date: 0 },
      { message_id: 9, date: 0 },
      { message_id: 10, date: 0 },
    ])
    const sel = await selectSourceMessages({
      trigger: trigger({ reply_to_message: reply, quote: { text: 'part' } }),
      chatId: -100,
      isPrivate: false,
      isGuest: false,
      count: -3,
      fetcher: td,
    })
    expect(sel.messages[0]?.selection).toBeUndefined()
    expect(sel.messages[2]?.selection?.text).toBe('part')
  })
})

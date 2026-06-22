import { describe, it, expect, vi } from 'vitest'
import { assembleQuoteMessages, type AssembleDeps, type RawMessage } from './assemble'
import type { Sender } from './sender'

function deps(over: Partial<AssembleDeps> = {}): AssembleDeps {
  return {
    chatType: 'supergroup',
    hidden: false,
    crop: false,
    forceMedia: false,
    showReply: false,
    unsupportedText: 'Unsupported',
    groupPrivacy: false,
    showSenderTag: true,
    enrichHidden: vi.fn(async () => null),
    isUserPrivate: vi.fn(async () => false),
    getUserEmojiStatus: vi.fn(async () => undefined),
    isGroupMember: vi.fn(async () => false),
    quoteMode: 'framed',
    ...over,
  }
}

const msg = (over: Partial<RawMessage> = {}): RawMessage => ({ message_id: 1, text: 'hi', from: { id: 1, first_name: 'A' }, ...over })

describe('assembleQuoteMessages', () => {
  it('builds a single message with the sender name', async () => {
    const out = await assembleQuoteMessages([msg()], deps({ chatType: 'private' }))
    expect(out.messages).toHaveLength(1)
    expect(out.messages[0]?.from?.name).toBe('A')
    expect(out.privacy).toBe(false)
  })

  it('suppresses name + avatar on a same-sender streak', async () => {
    const out = await assembleQuoteMessages(
      [msg({ message_id: 1 }), msg({ message_id: 2, text: 'again' })],
      deps({ chatType: 'private' }),
    )
    expect(out.messages[0]?.from?.name).toBe('A')
    expect(out.messages[1]?.from?.name).toBe(false)
    // avatar shown once: first suppressed because next is same sender
    expect(out.messages[0]?.avatar).toBe(false)
    expect(out.messages[1]?.avatar).toBe(true)
  })

  it('enriches the sender with a premium emoji status via the server', async () => {
    // The Bot API User object never carries an emoji status — it must be
    // resolved through getUserInfo for the native (count=1) path.
    const getUserEmojiStatus = vi.fn(async (id: number) => (id === 1 ? '5260463297979504556' : undefined))
    const out = await assembleQuoteMessages([msg()], deps({ chatType: 'private', getUserEmojiStatus }))
    expect(out.messages[0]?.from?.emoji_status).toBe('5260463297979504556')
    expect(getUserEmojiStatus).toHaveBeenCalledWith(1)
  })

  it('marks privacy when a quoted user is private', async () => {
    const isUserPrivate = vi.fn(async (id: number) => id === 1)
    const out = await assembleQuoteMessages([msg()], deps({ chatType: 'private', isUserPrivate }))
    expect(out.privacy).toBe(true)
    expect(isUserPrivate).toHaveBeenCalledWith(1)
  })

  it('forces privacy for the whole quote when groupPrivacy is set', async () => {
    const out = await assembleQuoteMessages([msg()], deps({ groupPrivacy: true }))
    expect(out.privacy).toBe(true)
  })

  it('adds a forward label in groups', async () => {
    const m = msg({ forward_origin: { type: 'hidden_user', sender_user_name: 'Ghost' } })
    const out = await assembleQuoteMessages([m], deps())
    expect(out.messages[0]?.forward?.label).toBe('Forwarded from Ghost')
  })

  it('attributes a group forward to the original author when they are a group member', async () => {
    // Someone in the group forwarded a message originally written by another
    // member: the quote should be attributed to that original member, with no
    // forwarder author and no "Forwarded from" label.
    const m = msg({
      from: { id: 50, first_name: 'Forwarder' },
      forward_origin: { type: 'user', sender_user: { id: 7, first_name: 'Orig' } },
    })
    const isGroupMember = vi.fn(async (id: number) => id === 7)
    const out = await assembleQuoteMessages([m], deps({ isGroupMember }))
    expect(isGroupMember).toHaveBeenCalledWith(7)
    expect(out.messages[0]?.from?.id).toBe(7)
    expect(out.messages[0]?.from?.name).toBe('Orig')
    expect(out.messages[0]?.forward).toBeUndefined()
  })

  it('keeps forwarder attribution + label when the original author is not a group member', async () => {
    const m = msg({
      from: { id: 50, first_name: 'Forwarder' },
      forward_origin: { type: 'user', sender_user: { id: 7, first_name: 'Orig' } },
    })
    const out = await assembleQuoteMessages([m], deps({ isGroupMember: vi.fn(async () => false) }))
    expect(out.messages[0]?.from?.name).toBe('Forwarder')
    expect(out.messages[0]?.forward?.label).toBe('Forwarded from Orig')
  })

  it('attributes a channel forward to the channel itself (no forwarder, no label) in groups', async () => {
    // Forwarding a channel post into a group: there's no real "forwarder" —
    // the channel is the author. Show it directly, like an auto-forward.
    const m = msg({
      from: { id: 50, first_name: 'Forwarder' },
      forward_origin: { type: 'channel', chat: { id: -100500, name: 'My Channel' } },
    })
    const out = await assembleQuoteMessages([m], deps())
    expect(out.messages[0]?.from?.id).toBe(-100500)
    expect(out.messages[0]?.from?.name).toBe('My Channel')
    expect(out.messages[0]?.forward).toBeUndefined()
  })

  it('attributes a legacy channel forward (forward_from_chat) to the channel', async () => {
    const m = msg({
      from: { id: 50, first_name: 'Forwarder' },
      forward_from_chat: { id: -100777, title: 'Legacy Channel' },
    })
    const out = await assembleQuoteMessages([m], deps())
    expect(out.messages[0]?.from?.id).toBe(-100777)
    expect(out.messages[0]?.from?.name).toBe('Legacy Channel')
    expect(out.messages[0]?.forward).toBeUndefined()
  })

  it('does not tag an auto-forwarded channel post as a forward', async () => {
    // A channel post in its linked discussion group: auto-forward + channel origin.
    const m = msg({
      text: 'channel post',
      from: undefined,
      is_automatic_forward: true,
      sender_chat: { id: -100123, title: 'My Channel' },
      forward_from_chat: { id: -100123, title: 'My Channel' },
      forward_origin: { type: 'channel', chat: { id: -100123, name: 'My Channel' } },
    })
    const out = await assembleQuoteMessages([m], deps())
    expect(out.messages[0]?.forward).toBeUndefined() // no "Forwarded from" label
    expect(out.messages[0]?.from?.name).toBe('My Channel') // channel stays the author
  })

  it('attributes a forwarded story to its chat', async () => {
    const m = msg({ text: undefined, from: { id: 5, first_name: 'Fwder' }, story: { id: 3, chat: { id: -100777, title: 'Story Channel' } } })
    const out = await assembleQuoteMessages([m], deps({ chatType: 'private' }))
    expect(out.messages[0]?.from?.name).toBe('Story Channel')
    expect(out.messages[0]?.mediaType).toBe('story')
    expect(out.messages[0]?.storyId).toBe(3)
  })

  it("omits the author's role/title (senderTag) when showSenderTag is off", async () => {
    const m = msg({ author_signature: 'Admin' })
    const on = await assembleQuoteMessages([m], deps({ chatType: 'private' }))
    expect(on.messages[0]?.senderTag).toBe('Admin')
    const off = await assembleQuoteMessages([m], deps({ chatType: 'private', showSenderTag: false }))
    expect(off.messages[0]?.senderTag).toBeUndefined()
  })

  it('omits the reply block unless showReply is set', async () => {
    const m = msg({ reply_to_message: { text: 'orig', from: { id: 9, first_name: 'B' } } })
    const off = await assembleQuoteMessages([m], deps({ chatType: 'private', showReply: false }))
    expect(off.messages[0]?.replyMessage).toEqual({})

    const on = await assembleQuoteMessages([m], deps({ chatType: 'private', showReply: true }))
    expect(on.messages[0]?.replyMessage?.text).toBe('orig')
    expect(on.messages[0]?.replyMessage?.name).toBe('B')
  })

  it('enriches a hidden-user forward via the injected resolver', async () => {
    const enrichHidden = vi.fn(async (): Promise<Sender> => ({ id: 77, first_name: 'Real' }))
    const m = msg({ forward_origin: { type: 'hidden_user', sender_user_name: 'Hidden' }, forward_sender_name: 'Hidden' })
    const out = await assembleQuoteMessages([m], deps({ chatType: 'private', hidden: true, enrichHidden }))
    expect(enrichHidden).toHaveBeenCalledWith('Hidden')
    expect(out.messages[0]?.from?.id).toBe(77)
  })

  it('skips sources without a message_id', async () => {
    const out = await assembleQuoteMessages([{ text: 'x' } as RawMessage], deps())
    expect(out.messages).toHaveLength(0)
  })
})

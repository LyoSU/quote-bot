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
    getAuthorTag: vi.fn(async () => undefined),
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

  it.each(['user', 'legacy'] as const)("uses only the original author's group role for a %s forward", async (kind) => {
    const author = { id: 7, first_name: 'Daniella' }
    const getAuthorTag = vi.fn(async (id: number) => id === 7 ? 'Жирчик' : 'Граф')
    const m = msg({
      from: { id: 50, first_name: 'Serhii', author_signature: 'Граф' },
      sender_tag: 'Граф',
      author_signature: 'Граф',
      ...(kind === 'user' ? { forward_origin: { type: 'user', sender_user: author } } : { forward_from: author }),
    })
    const out = await assembleQuoteMessages([m], deps({ isGroupMember: vi.fn(async () => true), getAuthorTag }))
    expect(out.messages[0]?.from?.name).toBe('Daniella')
    expect(out.messages[0]?.senderTag).toBe('Жирчик')
    expect(getAuthorTag).toHaveBeenCalledExactlyOnceWith(7)
  })

  it.each(['missing', 'failed'] as const)('omits a forwarded author role when lookup is %s', async (lookup) => {
    const getAuthorTag = vi.fn(async () => {
      if (lookup === 'failed') throw new Error('Unavailable')
      return undefined
    })
    const out = await assembleQuoteMessages([msg({
      sender_tag: 'Forwarder role',
      author_signature: 'Forwarder signature',
      forward_origin: { type: 'user', sender_user: { id: 7, first_name: 'Original' } },
    })], deps({ isGroupMember: vi.fn(async () => true), getAuthorTag }))
    expect(out.messages[0]?.senderTag).toBeUndefined()
    expect(getAuthorTag).toHaveBeenCalledExactlyOnceWith(7)
  })

  it.each(['private', 'supergroup'])('never takes a hidden forward role from its forwarder in %s', async (chatType) => {
    const getAuthorTag = vi.fn(async () => 'Wrong')
    const out = await assembleQuoteMessages([msg({
      sender_tag: 'Граф',
      author_signature: 'Граф',
      forward_origin: { type: 'hidden_user', sender_user_name: 'Daniella' },
    })], deps({ chatType, getAuthorTag }))
    expect(out.messages[0]?.senderTag).toBeUndefined()
    expect(getAuthorTag).not.toHaveBeenCalled()
  })

  it('omits roles when displaying a forwarder header', async () => {
    const getAuthorTag = vi.fn(async () => 'Original role')
    const out = await assembleQuoteMessages([msg({
      sender_tag: 'Forwarder role',
      forward_origin: { type: 'user', sender_user: { id: 7, first_name: 'Original' } },
    })], deps({ getAuthorTag }))
    expect(out.messages[0]?.forward).toBeDefined()
    expect(out.messages[0]?.senderTag).toBeUndefined()
    expect(getAuthorTag).not.toHaveBeenCalled()
  })

  it('does not look up group roles for user forwards in private chats', async () => {
    const getAuthorTag = vi.fn(async () => 'Wrong')
    const out = await assembleQuoteMessages([msg({
      sender_tag: 'Forwarder role',
      forward_origin: { type: 'user', sender_user: { id: 7, first_name: 'Original' } },
    })], deps({ chatType: 'private', getAuthorTag }))
    expect(out.messages[0]?.senderTag).toBeUndefined()
    expect(getAuthorTag).not.toHaveBeenCalled()
  })

  it.each(['chat', 'channel'] as const)('uses only the original signature for a %s forward', async (type) => {
    const chat = { id: -100500, title: 'Channel' }
    const getAuthorTag = vi.fn(async () => 'Wrong')
    for (const signature of ['Editor', undefined]) {
      const out = await assembleQuoteMessages([msg({
        sender_tag: 'Forwarder role',
        author_signature: 'Forwarder signature',
        forward_origin: { type, chat, sender_chat: chat, author_signature: signature },
      })], deps({ getAuthorTag }))
      expect(out.messages[0]?.senderTag).toBe(signature)
    }
    expect(getAuthorTag).not.toHaveBeenCalled()
  })

  it('skips author role lookups when role display is disabled', async () => {
    const getAuthorTag = vi.fn(async () => 'Original role')
    const out = await assembleQuoteMessages([msg({
      forward_origin: { type: 'user', sender_user: { id: 7 } },
    })], deps({ showSenderTag: false, isGroupMember: vi.fn(async () => true), getAuthorTag }))
    expect(out.messages[0]?.senderTag).toBeUndefined()
    expect(getAuthorTag).not.toHaveBeenCalled()
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

  it('tags owners/admins with their role: custom title, else the default label', async () => {
    const getAuthorRole = vi.fn(async (id: number) => (id === 1 ? 'owner' : id === 2 ? 'admin' : undefined) as 'owner' | 'admin' | undefined)
    const roleLabels = { owner: 'власник', admin: 'адмін' }
    const out = await assembleQuoteMessages(
      [
        msg({ message_id: 1, sender_tag: 'Бос' }),
        msg({ message_id: 2, from: { id: 2, first_name: 'B' } }),
        msg({ message_id: 3, from: { id: 3, first_name: 'C' }, sender_tag: 'moral patient' }),
        msg({ message_id: 4, from: { id: 4, first_name: 'D' } }),
      ],
      deps({ getAuthorRole, roleLabels }),
    )
    expect(out.messages.map((m) => [m.senderTag, m.senderTagRole])).toEqual([
      ['Бос', 'owner'],
      ['адмін', 'admin'],
      ['moral patient', 'member'],
      [undefined, undefined],
    ])
  })

  it('never resolves roles in private chats', async () => {
    const getAuthorRole = vi.fn(async () => 'admin' as const)
    const out = await assembleQuoteMessages([msg()], deps({ chatType: 'private', getAuthorRole, roleLabels: { owner: 'o', admin: 'a' } }))
    expect(getAuthorRole).not.toHaveBeenCalled()
    expect(out.messages[0]?.senderTag).toBeUndefined()
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

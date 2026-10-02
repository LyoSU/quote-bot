import { beforeEach, describe, expect, it } from 'vitest'
import { buildQuoteMessage } from './build-message'
import { DEFAULT_LABELS, labelsFromTranslator } from './labels'
import { selectSourceMessages, type MessageFetcher } from './select'
import type { RawMessage } from './assemble'
import type { Sender } from './sender'
import {
  convertChecklist,
  convertGiveaway,
  DEFAULT_SPECIAL_LABELS,
  hasSpecialTypeContent,
  specialReplyLabel,
} from './special-types'
import { clearTopicCache, dedupeTopics, isTopicRoot, lookupTopic, recordTopic, resolveTopic, rgbToHex } from './topics'

const alice: Sender = { id: 1, first_name: 'Alice' }
type Source = Parameters<typeof buildQuoteMessage>[0]['source']
const build = (source: object, showReply = true) =>
  buildQuoteMessage({
    source: source as Source,
    from: alice,
    replyFrom: { id: 2, first_name: 'Bob' },
    isFirstInStreak: true,
    showReply,
    crop: false,
    forceMedia: false,
    unsupportedText: 'Unsupported',
  })

const sticker = (id: string, animated = true) => ({
  file_id: id,
  is_animated: animated,
  is_video: false,
  thumbnail: { file_id: `${id}-thumb`, width: 128, height: 128 },
})

const task = (id: number, text: string, done = false) => ({
  id,
  text,
  ...(done ? { completed_by_user: { id: 1, first_name: 'A' }, completion_date: 1_700_000_000 } : {}),
})

describe('checklist', () => {
  const checklist = {
    title: 'Groceries',
    title_entities: [{ type: 'italic' as const, offset: 0, length: 9 }],
    tasks: [
      task(1, 'Milk', true),
      { ...task(2, 'Bread 🍞'), text_entities: [{ type: 'bold' as const, offset: 0, length: 5 }] },
      { id: 3, text: 'Eggs', completed_by_chat: { id: -100 } },
      { id: 4, text: 'Butter', completion_date: 0 },
    ],
    others_can_mark_tasks_as_done: true,
  }

  it('converts tasks with done = completed_by_user/chat/date', () => {
    const { checklist: c } = convertChecklist(checklist)
    expect(c.title).toBe('Groceries')
    expect(c.title_entities).toEqual(checklist.title_entities)
    expect(c.tasks.map((t) => t.done)).toEqual([true, false, true, false])
    expect(c.tasks[1]!.entities).toEqual([{ type: 'bold', offset: 0, length: 5 }])
    expect(c.othersCanMarkDone).toBe(true)
    expect(c.footer).toBe('2 of 4 completed')
  })

  it('fills a ☑/☐ fallback text with shifted entities', () => {
    const { fallback } = convertChecklist(checklist)
    expect(fallback.text).toBe('Groceries\n☑ Milk\n☐ Bread 🍞\n☑ Eggs\n☐ Butter')
    expect(fallback.entities).toContainEqual({ type: 'bold', offset: 0, length: 9 })
    expect(fallback.entities).toContainEqual({ type: 'italic', offset: 0, length: 9 })
    // "Bread" starts after "Groceries\n☑ Milk\n☐ " (UTF-16 offsets).
    const at = fallback.text.indexOf('Bread')
    expect(fallback.entities).toContainEqual({ type: 'bold', offset: at, length: 5 })
  })

  it('is quoted as a card + fallback instead of "unsupported"', () => {
    const out = build({ message_id: 5, checklist })
    expect(out.checklist?.tasks).toHaveLength(4)
    expect(out.text?.startsWith('Groceries\n☑ Milk')).toBe(true)
    expect(out.text).not.toBe('Unsupported')
  })

  it('uses localized labels', () => {
    const t = (key: string, args?: Record<string, string | number>) =>
      key === 'quote-checklist-progress' ? `${args?.done}/${args?.total} готово` : key
    const labels = labelsFromTranslator(t as (key: string, args?: Record<string, string>) => string)
    const out = buildQuoteMessage({
      source: { message_id: 5, checklist } as Source,
      from: alice,
      isFirstInStreak: true,
      showReply: false,
      crop: false,
      forceMedia: false,
      unsupportedText: 'U',
      labels,
    })
    expect(out.checklist?.footer).toBe('2/4 готово')
  })

  it('renders tasks_done / tasks_added as one short line', () => {
    expect(build({ message_id: 6, checklist_tasks_done: { marked_as_done_task_ids: [1, 2] } }).text).toBe(
      '☑️ Marked 2 tasks as done',
    )
    expect(
      build({ message_id: 6, checklist_tasks_done: { marked_as_done_task_ids: [1], marked_as_not_done_task_ids: [3] } })
        .text,
    ).toBe('☑️ Marked 1 task as done · Marked 1 task as not done')
    expect(build({ message_id: 7, checklist_tasks_added: { tasks: [task(5, 'Tea')] } }).text).toBe('➕ Added 1 task')
  })
})

describe('gifts', () => {
  it('converts a regular gift: thumbnail-backed sticker, stars, own text below', () => {
    const out = build({
      message_id: 1,
      gift: {
        gift: { id: 'g1', sticker: sticker('heart'), star_count: 50 },
        text: 'Happy birthday!',
        entities: [{ type: 'bold', offset: 0, length: 5 }],
      },
    })
    expect(out.gift).toEqual({
      kind: 'regular',
      title: 'Gift',
      sticker: { file_id: 'heart', is_animated: true, thumb: { file_id: 'heart-thumb' } },
      starCount: 50,
      text: 'Happy birthday!',
      entities: [{ type: 'bold', offset: 0, length: 5 }],
    })
    // Fallback: "🎁 Gift · ⭐ 50" + the text with its entity shifted past the head line.
    expect(out.text).toBe('🎁 Gift · ⭐ 50\nHappy birthday!')
    const at = out.text!.indexOf('Happy')
    expect(out.entities).toContainEqual({ type: 'bold', offset: at, length: 5 })
  })

  it('converts gift_upgrade_sent with its own title', () => {
    const out = build({ message_id: 1, gift_upgrade_sent: { gift: { sticker: sticker('x', false), star_count: 25 } } })
    expect(out.gift).toMatchObject({ kind: 'regular', title: 'Gift upgrade', sticker: { file_id: 'x' } })
    expect(out.gift && 'sticker' in out.gift && out.gift.sticker?.is_animated).toBeFalsy()
  })

  it('converts a unique gift with RGB24 colors as #rrggbb', () => {
    const out = build({
      message_id: 2,
      unique_gift: {
        origin: 'upgrade',
        gift: {
          gift_id: 'g',
          base_name: 'Plush Pepe',
          name: 'PlushPepe-42',
          number: 42,
          model: { name: 'Cozy', sticker: sticker('model'), rarity_per_mille: 12 },
          symbol: { name: 'Crown', sticker: sticker('symbol'), rarity_per_mille: 4 },
          backdrop: {
            name: 'Midnight',
            colors: { center_color: 0x4a6cf7, edge_color: 0x0b1a5c, symbol_color: 0x001f, text_color: 0xffffff },
            rarity_per_mille: 20,
          },
        },
      },
    })
    expect(out.gift).toMatchObject({
      kind: 'unique',
      name: 'Plush Pepe #42',
      attributes: 'Cozy · Midnight · Crown',
      model: { name: 'Cozy', sticker: { file_id: 'model', thumb: { file_id: 'model-thumb' } } },
      symbol: { name: 'Crown', sticker: { file_id: 'symbol' } },
      backdrop: { name: 'Midnight', centerColor: '#4a6cf7', edgeColor: '#0b1a5c', symbolColor: '#00001f', textColor: '#ffffff' },
    })
    expect(out.text).toBe('🎁 Plush Pepe #42')
  })

  it('rgbToHex rejects malformed ints', () => {
    expect(rgbToHex(0)).toBe('#000000')
    expect(rgbToHex(0xffffff)).toBe('#ffffff')
    expect(rgbToHex(-1)).toBeUndefined()
    expect(rgbToHex(0x1000000)).toBeUndefined()
    expect(rgbToHex(1.5)).toBeUndefined()
  })
})

describe('giveaways', () => {
  const date = Date.UTC(2026, 9, 12) / 1000
  const chats = ['Alpha', 'Beta', 'Gamma', 'Delta'].map((title, i) => ({ id: -100 - i, type: 'channel', title }))

  it('premium giveaway: prize, winners · date, max 3 channels then +N', () => {
    const g = convertGiveaway({
      giveaway: { chats, winners_selection_date: date, winner_count: 5, premium_subscription_month_count: 3 },
    })!
    expect(g).toEqual({
      kind: 'giveaway',
      title: 'Giveaway',
      prize: '5× Telegram Premium · 3 months',
      meta: ['5 winners · Results on Oct 12, 2026', 'Alpha, Beta, Gamma +1'],
    })
  })

  it('stars giveaway with an additional prize description', () => {
    const g = convertGiveaway({
      giveaway: { chats: chats.slice(0, 1), winners_selection_date: date, winner_count: 1, prize_star_count: 10000, prize_description: 'Stickers' },
    })!
    expect(g.prize).toBe('Stickers\n⭐ 10,000 Stars')
    expect(g.meta).toEqual(['1 winner · Results on Oct 12, 2026', 'Alpha'])
  })

  it('winners: the first 3 names, rest folded into +N', () => {
    const out = build({
      message_id: 3,
      giveaway_winners: {
        chat: chats[0],
        giveaway_message_id: 1,
        winners_selection_date: date,
        winner_count: 7,
        winners: [{ id: 1, first_name: 'Ann' }, { id: 2, first_name: 'Ben', last_name: 'Ng' }, { id: 3, first_name: 'Cy' }, { id: 4, first_name: 'Di' }],
        premium_subscription_month_count: 6,
      },
    })
    expect(out.giveaway).toMatchObject({ kind: 'winners', title: 'Giveaway winners', winners: 'Ann, Ben Ng, Cy +4' })
    expect(out.text).toContain('🏆 Ann, Ben Ng, Cy +4')
    expect(out.entities).toEqual([{ type: 'bold', offset: 3, length: 'Giveaway winners'.length }])
  })

  it('completed giveaway + scheduled service line', () => {
    expect(build({ message_id: 4, giveaway_completed: { winner_count: 2, is_star_giveaway: true } }).giveaway).toEqual({
      kind: 'completed',
      title: 'Giveaway completed',
      meta: ['2 winners'],
    })
    expect(build({ message_id: 4, giveaway_created: { prize_star_count: 500 } }).text).toBe('🎁 Giveaway scheduled · ⭐ 500 Stars')
  })
})

describe('stories', () => {
  const channel = { id: -1001, type: 'channel', title: 'News' }

  it('reply to a story → reply chip with the story chat, "Story" and a ring', () => {
    const out = build({ message_id: 9, text: 'wow', reply_to_story: { chat: channel, id: 77 } })
    expect(out.replyMessage).toEqual({ name: 'News', chatId: -1001, text: 'Story', media: { kind: 'story' } })
  })

  it('story reply chip only with the reply flag', () => {
    expect(build({ message_id: 9, text: 'wow', reply_to_story: { chat: channel, id: 77 } }, false).replyMessage).toEqual({})
  })

  it('forwarded story → story row + fallback text, not "unsupported"', () => {
    const out = build({ message_id: 10, story: { chat: channel, id: 77 } })
    expect(out.story).toEqual({ label: 'Story', chatName: 'News' })
    expect(out.mediaType).toBe('story')
    expect(out.text).toBe('📖 Story')
  })
})

describe('reply labels + content detection', () => {
  it('labels replies to special messages instead of dropping the block', () => {
    const out = build({ message_id: 11, text: 'nice', reply_to_message: { message_id: 3, checklist: { title: 'Plan', tasks: [] } } })
    expect(out.replyMessage?.text).toBe('☑️ Plan')
    expect(specialReplyLabel({ giveaway: { winner_count: 1 } }, DEFAULT_LABELS)).toBe('🎁 Giveaway')
    expect(specialReplyLabel({ unique_gift: { gift: { base_name: 'Cap', number: 3 } } })).toBe('🎁 Cap #3')
  })

  it('hasSpecialTypeContent counts every handled type (not bare topic service messages)', () => {
    expect(hasSpecialTypeContent({ checklist: { title: 't', tasks: [] } })).toBe(true)
    expect(hasSpecialTypeContent({ gift: { gift: {} } })).toBe(true)
    expect(hasSpecialTypeContent({ unique_gift: { gift: {} } })).toBe(true)
    expect(hasSpecialTypeContent({ giveaway_winners: { winner_count: 1 } })).toBe(true)
    expect(hasSpecialTypeContent({ checklist_tasks_done: { marked_as_done_task_ids: [1] } })).toBe(true)
    expect(hasSpecialTypeContent({ checklist_tasks_done: {} })).toBe(false)
    expect(hasSpecialTypeContent({ forum_topic_created: { name: 'x', icon_color: 1 } })).toBe(false)
    expect(hasSpecialTypeContent({ text: 'x' })).toBe(false)
  })

  it('default labels are English', () => {
    expect(DEFAULT_SPECIAL_LABELS.stars(1)).toBe('1 Star')
    expect(DEFAULT_SPECIAL_LABELS.premium(3, 1)).toBe('3× Telegram Premium · 1 month')
  })
})

describe('forum topics', () => {
  const chat = { id: -100500, type: 'supergroup', is_forum: true }
  const root = { message_id: 40, chat, message_thread_id: 40, forum_topic_created: { name: 'Design', icon_color: 0x6fb9f0 } }

  beforeEach(() => clearTopicCache())

  it('the topic root is not a reply: no reply block, topic captured from it', () => {
    const out = build({ message_id: 41, chat, text: 'hi', message_thread_id: 40, is_topic_message: true, reply_to_message: root })
    expect(out.replyMessage).toEqual({})
    expect(out.topic).toEqual({ name: 'Design', iconColor: '#6fb9f0' })
    expect(isTopicRoot(root)).toBe(true)
    expect(isTopicRoot({ message_id: 3 })).toBe(false)
  })

  it('a real reply inside a topic keeps its reply block; topic comes from the cache', () => {
    recordTopic({ chat, message_thread_id: 40, forum_topic_created: { name: 'Design', icon_color: 0xffd67e, icon_custom_emoji_id: 'e1' } })
    const out = build({ message_id: 42, chat, text: 'yes', message_thread_id: 40, is_topic_message: true, reply_to_message: { message_id: 41, text: 'hi' } })
    expect(out.replyMessage?.text).toBe('hi')
    expect(out.topic).toEqual({ name: 'Design', iconColor: '#ffd67e', iconEmojiId: 'e1' })
  })

  it('no topic outside forum topics or when unknown', () => {
    expect(build({ message_id: 1, chat, text: 'general' }).topic).toBeUndefined()
    expect(build({ message_id: 1, chat, text: 'x', message_thread_id: 99, is_topic_message: true }).topic).toBeUndefined()
    // A reply thread in a regular supergroup also has a thread id, but is no topic.
    expect(resolveTopic({ chat, message_thread_id: 40 })).toBeUndefined()
  })

  it('cache: created/edited are authoritative, a root only seeds a missing entry', () => {
    recordTopic({ chat, message_thread_id: 40, forum_topic_created: { name: 'Old', icon_color: 0xcb86db } })
    recordTopic({ chat, message_thread_id: 40, forum_topic_edited: { name: 'New', icon_custom_emoji_id: 'e2' } })
    expect(lookupTopic(chat.id, 40)).toEqual({ name: 'New', iconColor: '#cb86db', iconEmojiId: 'e2' })
    // A message still carrying the original root must not revert the rename.
    recordTopic({ chat, message_thread_id: 40, reply_to_message: { forum_topic_created: { name: 'Old', icon_color: 1 } } })
    expect(lookupTopic(chat.id, 40)?.name).toBe('New')
    // Removing the custom icon.
    recordTopic({ chat, message_thread_id: 40, forum_topic_edited: { icon_custom_emoji_id: '' } })
    expect(lookupTopic(chat.id, 40)).toEqual({ name: 'New', iconColor: '#cb86db' })
    // A root seeds an unknown topic.
    recordTopic({ chat, message_thread_id: 77, reply_to_message: { forum_topic_created: { name: 'Seeded', icon_color: 0x8eee98 } } })
    expect(lookupTopic(chat.id, 77)).toEqual({ name: 'Seeded', iconColor: '#8eee98' })
    // An edit for an unknown topic without a name is ignored.
    recordTopic({ chat, message_thread_id: 78, forum_topic_edited: { icon_custom_emoji_id: 'e3' } })
    expect(lookupTopic(chat.id, 78)).toBeUndefined()
  })

  it('dedupeTopics keeps one header per run of the same topic', () => {
    const t = (name?: string) => (name ? { topic: { name } } : {})
    const msgs: { topic?: { name: string } }[] = [t('A'), t('A'), t('B'), t(), t('B')]
    dedupeTopics(msgs)
    expect(msgs.map((m) => m.topic?.name)).toEqual(['A', undefined, 'B', undefined, 'B'])
  })

  it('select: /q in a topic without a real reply quotes nothing (not the topic root)', async () => {
    const fetcher: MessageFetcher = { isHealthy: () => false, getMessages: async () => [] }
    const trigger = { message_id: 50, chat, text: '/q', message_thread_id: 40, is_topic_message: true, reply_to_message: root }
    const sel = await selectSourceMessages({
      trigger: trigger as unknown as RawMessage,
      chatId: chat.id,
      isPrivate: false,
      isGuest: false,
      fetcher,
    })
    expect(sel.messages).toEqual([])
    // …while a reply to a real message inside the topic still selects it.
    const real = { ...trigger, reply_to_message: { message_id: 41, chat, text: 'hi', message_thread_id: 40, reply_to_message: root } }
    const sel2 = await selectSourceMessages({
      trigger: real as unknown as RawMessage,
      chatId: chat.id,
      isPrivate: false,
      isGuest: false,
      fetcher,
    })
    expect(sel2.messages.map((m) => m.message_id)).toEqual([41])
  })
})

import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { I18n } from '@grammyjs/i18n'
import { buildQuoteMessage } from './build-message'
import { labelsFromTranslator } from './labels'
import type { Sender } from './sender'
import {
  DEFAULT_SERVICE_LABELS,
  formatDuration,
  isServiceMessage,
  serviceLabelsFromTranslator,
  serviceMessageLine,
  type ServiceLabels,
  type ServiceMessageSource,
} from './service-messages'
import { hasSpecialTypeContent, specialReplyLabel } from './special-types'

const alice = { id: 1, first_name: 'Alice' }
const user = (id: number, first_name: string, last_name?: string) => ({ id, first_name, ...(last_name ? { last_name } : {}) })
const line = (src: ServiceMessageSource) => serviceMessageLine({ from: alice, ...src })

describe('serviceMessageLine', () => {
  it('new_chat_members: self-join vs. added by someone else', () => {
    expect(line({ new_chat_members: [alice] })).toBe('👋 Joined the group')
    expect(line({ new_chat_members: [user(2, 'Bob', 'Stone')] })).toBe('➕ Added Bob Stone')
    expect(line({ new_chat_members: [alice, user(2, 'Bob')] })).toBe('➕ Added Alice, Bob')
    expect(line({ new_chat_members: [] })).toBeUndefined()
  })

  it('caps the name list at three and counts the rest as +N', () => {
    const members = [user(2, 'Bob'), user(3, 'Carol'), user(4, 'Dan'), user(5, 'Eve'), user(6, 'Frank'), user(7, 'Grace')]
    expect(line({ new_chat_members: members })).toBe('➕ Added Bob, Carol, Dan +3')
    expect(line({ video_chat_participants_invited: { users: members.slice(0, 4) } })).toBe('📹 Invited Bob, Carol, Dan +1 to the video chat')
    expect(line({ video_chat_participants_invited: { users: members.slice(0, 3) } })).toBe('📹 Invited Bob, Carol, Dan to the video chat')
  })

  it('clips over-long names and titles, and falls back to @username', () => {
    const long = 'x'.repeat(40)
    expect(line({ new_chat_members: [user(2, long)] })).toBe(`➕ Added ${'x'.repeat(23)}…`)
    expect(line({ new_chat_members: [{ id: 2, username: 'bob' }] })).toBe('➕ Added @bob')
    expect(line({ new_chat_title: 'y'.repeat(100) })).toBe(`✏️ Changed the group name to «${'y'.repeat(63)}…»`)
  })

  it('left_chat_member: left on their own vs. removed', () => {
    expect(line({ left_chat_member: alice })).toBe('🚪 Left the group')
    expect(line({ left_chat_member: user(2, 'Bob') })).toBe('🚫 Removed Bob')
    expect(serviceMessageLine({ left_chat_member: user(2, 'Bob') })).toBe('🚪 Left the group')
  })

  it('chat title / photo / creation', () => {
    expect(line({ new_chat_title: 'Night  owls\n' })).toBe('✏️ Changed the group name to «Night owls»')
    expect(line({ new_chat_photo: [{ file_id: 'p' }] })).toBe('🖼 Changed the group photo')
    expect(line({ delete_chat_photo: true })).toBe('🗑 Removed the group photo')
    expect(line({ group_chat_created: true })).toBe('👥 Created the group')
    expect(line({ supergroup_chat_created: true })).toBe('👥 Created the group')
    expect(line({ channel_chat_created: true })).toBe('📢 Created the channel')
  })

  it('pinned_message: with a short excerpt when the text is available', () => {
    expect(line({ pinned_message: {} })).toBe('📌 Pinned a message')
    expect(line({ pinned_message: { text: 'Rules:\nbe kind' } })).toBe('📌 Pinned «Rules: be kind»')
    expect(line({ pinned_message: { caption: 'c'.repeat(80) } })).toBe(`📌 Pinned «${'c'.repeat(39)}…»`)
  })

  it('video chats: scheduled / started / ended with a duration / invited', () => {
    expect(line({ video_chat_scheduled: { start_date: Date.UTC(2026, 9, 12, 12) / 1000 } })).toBe('📹 Scheduled a video chat for Oct 12')
    expect(line({ video_chat_scheduled: {} })).toBe('📹 Scheduled a video chat')
    expect(line({ video_chat_started: {} })).toBe('📹 Started a video chat')
    expect(line({ video_chat_ended: { duration: 2 * 3600 + 15 * 60 + 7 } })).toBe('📹 Video chat ended · 2 h 15 min')
    expect(line({ video_chat_ended: { duration: 3 * 86400 } })).toBe('📹 Video chat ended · 3 d')
    expect(line({ video_chat_ended: {} })).toBe('📹 Video chat ended')
    expect(line({ video_chat_participants_invited: { users: [user(2, 'Bob')] } })).toBe('📹 Invited Bob to the video chat')
    expect(line({ video_chat_participants_invited: {} })).toBe('📹 Invited participants to the video chat')
  })

  it('auto-delete timer, boosts, background', () => {
    expect(line({ message_auto_delete_timer_changed: { message_auto_delete_time: 86400 } })).toBe('⏱ Set messages to auto-delete after 1 d')
    expect(line({ message_auto_delete_timer_changed: { message_auto_delete_time: 0 } })).toBe('⏱ Disabled auto-delete')
    expect(line({ boost_added: { boost_count: 1 } })).toBe('🚀 Boosted the group')
    expect(line({ boost_added: { boost_count: 3 } })).toBe('🚀 Boosted the group 3 times')
    expect(line({ boost_added: {} })).toBe('🚀 Boosted the group')
    expect(line({ chat_background_set: { type: {} } })).toBe('🖼 Changed the chat background')
  })

  it('forum topic events (the topic root itself is not one)', () => {
    expect(line({ forum_topic_edited: { name: 'Design' } })).toBe('✏️ Renamed the topic to «Design»')
    expect(line({ forum_topic_edited: { icon_custom_emoji_id: 'e1' } })).toBe('✏️ Changed the topic icon')
    expect(line({ forum_topic_closed: {} })).toBe('🔒 Closed the topic')
    expect(line({ forum_topic_reopened: {} })).toBe('🔓 Reopened the topic')
    expect(line({ general_forum_topic_hidden: {} })).toBe('🙈 Hid the General topic')
    expect(line({ general_forum_topic_unhidden: {} })).toBe('👁 Unhid the General topic')
    expect(isServiceMessage({ forum_topic_created: { name: 'x' } })).toBe(false)
  })

  it('is undefined for regular messages', () => {
    expect(line({})).toBeUndefined()
    expect(isServiceMessage({ text: 'hi', from: alice })).toBe(false)
    expect(isServiceMessage({ delete_chat_photo: false })).toBe(false)
    expect(isServiceMessage({ video_chat_started: {} })).toBe(true)
  })
})

describe('formatDuration', () => {
  it('uses the two largest units', () => {
    expect(formatDuration(40)).toBe('40 s')
    expect(formatDuration(60)).toBe('1 min')
    expect(formatDuration(15 * 60 + 59)).toBe('15 min')
    expect(formatDuration(3600)).toBe('1 h')
    expect(formatDuration(3600 + 60)).toBe('1 h 1 min')
    expect(formatDuration(86400 + 4 * 3600 + 120)).toBe('1 d 4 h')
    expect(formatDuration(7 * 86400)).toBe('7 d')
  })

  it('is empty for missing / non-positive values', () => {
    expect(formatDuration(undefined)).toBe('')
    expect(formatDuration(0)).toBe('')
    expect(formatDuration(-5)).toBe('')
    expect(formatDuration(Number.NaN)).toBe('')
  })
})

describe('quoting a service message', () => {
  const sender: Sender = { id: 1, first_name: 'Alice' }
  type Source = Parameters<typeof buildQuoteMessage>[0]['source']
  const build = (source: object) =>
    buildQuoteMessage({
      source: source as Source,
      from: sender,
      replyFrom: { id: 2, first_name: 'Bob' },
      isFirstInStreak: true,
      showReply: true,
      crop: false,
      forceMedia: false,
      unsupportedText: 'Unsupported',
    })

  it('yields the service line instead of the "unsupported" text', () => {
    const out = build({ message_id: 7, from: alice, video_chat_ended: { duration: 125 } })
    expect(out.text).toBe('📹 Video chat ended · 2 min')
    expect(out.entities).toBeUndefined()
    expect(build({ message_id: 8, from: alice, new_chat_members: [alice] }).text).toBe('👋 Joined the group')
    expect(build({ message_id: 9, from: alice, pinned_message: { message_id: 3, text: 'Rules' } }).text).toBe('📌 Pinned «Rules»')
  })

  it('counts as quotable content and labels a reply pointing at it', () => {
    expect(hasSpecialTypeContent({ video_chat_participants_invited: { users: [user(2, 'Bob')] } })).toBe(true)
    expect(hasSpecialTypeContent({ left_chat_member: alice })).toBe(true)
    expect(specialReplyLabel({ from: alice, new_chat_title: 'Owls' })).toBe('✏️ Changed the group name to «Owls»')
    const out = build({ message_id: 11, text: 'welcome!', reply_to_message: { message_id: 8, from: user(2, 'Bob'), new_chat_members: [user(2, 'Bob')] } })
    expect(out.replyMessage?.text).toBe('👋 Joined the group')
  })

  it('uses the localized labels', () => {
    const t = (key: string, args?: Record<string, string | number>) => (args ? `${key}:${Object.values(args).join(',')}` : key)
    const labels = labelsFromTranslator(t as Parameters<typeof labelsFromTranslator>[0])
    const out = buildQuoteMessage({
      source: { message_id: 7, video_chat_ended: { duration: 3660 } } as Source,
      from: sender,
      isFirstInStreak: true,
      showReply: false,
      crop: false,
      forceMedia: false,
      unsupportedText: 'U',
      labels,
    })
    expect(out.text).toBe('📹 quote-service-video-ended · quote-duration-hours:1 quote-duration-minutes:1')
  })
})

describe('service label locales', () => {
  const i18n = new I18n({ defaultLocale: 'en', fluentBundleOptions: { useIsolating: false } })
  i18n.loadLocalesDirSync(path.join(__dirname, '../../i18n/locales'))
  const labelsFor = (code: string): ServiceLabels => serviceLabelsFromTranslator((key, args) => i18n.t(code, key, args))

  /** Every label rendered once, keyed by its Fluent id. */
  const render = (sl: ServiceLabels): Record<string, string> => ({
    'quote-service-joined': sl.joined,
    'quote-service-added': sl.added('NAMES'),
    'quote-service-left': sl.left,
    'quote-service-removed': sl.removed('NAME'),
    'quote-service-title': sl.title('TITLE'),
    'quote-service-photo': sl.photo,
    'quote-service-photo-removed': sl.photoRemoved,
    'quote-service-group-created': sl.groupCreated,
    'quote-service-channel-created': sl.channelCreated,
    'quote-service-pinned': sl.pinned,
    'quote-service-pinned-text': sl.pinnedText('TEXT'),
    'quote-service-video-scheduled': sl.videoChatScheduled(Date.UTC(2026, 9, 12, 12) / 1000),
    'quote-service-video-scheduled-soon': sl.videoChatScheduledSoon,
    'quote-service-video-started': sl.videoChatStarted,
    'quote-service-video-ended': sl.videoChatEnded,
    'quote-service-video-invited': sl.videoChatInvited('NAMES'),
    'quote-service-video-invited-some': sl.videoChatInvitedSome,
    'quote-service-auto-delete': sl.autoDelete('DURATION'),
    'quote-service-auto-delete-off': sl.autoDeleteOff,
    'quote-service-boost': sl.boost(5),
    'quote-service-background': sl.background,
    'quote-service-topic-renamed': sl.topicRenamed('NAME'),
    'quote-service-topic-icon': sl.topicIcon,
    'quote-service-topic-closed': sl.topicClosed,
    'quote-service-topic-reopened': sl.topicReopened,
    'quote-service-general-hidden': sl.generalHidden,
    'quote-service-general-unhidden': sl.generalUnhidden,
    'quote-duration-days': sl.days(3),
    'quote-duration-hours': sl.hours(3),
    'quote-duration-minutes': sl.minutes(3),
    'quote-duration-seconds': sl.seconds(3),
  })

  it('covers all 19 locales', () => {
    expect(i18n.locales).toHaveLength(19)
  })

  it.each(i18n.locales)('%s defines every key and keeps the placeholders', (code) => {
    const sl = labelsFor(code)
    const out = render(sl)
    for (const [key, value] of Object.entries(out)) {
      expect(value, `${code}:${key}`).not.toBe(key)
      expect(value, `${code}:${key}`).not.toMatch(/\{\s*\$|\{\s*DATETIME/)
    }
    expect(out['quote-service-added']).toContain('NAMES')
    expect(out['quote-service-removed']).toContain('NAME')
    expect(out['quote-service-title']).toContain('TITLE')
    expect(out['quote-service-pinned-text']).toContain('TEXT')
    expect(out['quote-service-video-invited']).toContain('NAMES')
    expect(out['quote-service-auto-delete']).toContain('DURATION')
    expect(out['quote-service-topic-renamed']).toContain('NAME')
    expect(out['quote-service-video-scheduled']).not.toBe(sl.videoChatScheduledSoon)
    for (const unit of ['days', 'hours', 'minutes', 'seconds'] as const) expect(out[`quote-duration-${unit}`]).toContain('3')
    // A single boost never spells out a bare "1 times"; several always carry the count.
    expect(sl.boost(5)).toContain('5')
    expect(sl.boost(1)).not.toBe(sl.boost(5))
  })

  it.each(i18n.locales.filter((l) => l !== 'en'))('%s is translated, not an English copy', (code) => {
    const en = render(labelsFor('en'))
    const out = render(labelsFor(code))
    for (const key of Object.keys(en).filter((k) => k.startsWith('quote-service-'))) {
      expect(out[key], `${code}:${key}`).not.toBe(en[key])
    }
  })

  it('en matches the built-in defaults', () => {
    const en = render(labelsFor('en'))
    const defaults = render(DEFAULT_SERVICE_LABELS)
    for (const key of Object.keys(defaults)) expect(en[key], key).toBe(defaults[key])
    expect(labelsFor('en').boost(1)).toBe(DEFAULT_SERVICE_LABELS.boost(1))
  })

  it('picks the plural form of a boost count', () => {
    expect(labelsFor('en').boost(1)).toBe('Boosted the group')
    expect(labelsFor('en').boost(2)).toBe('Boosted the group 2 times')
    const uk = labelsFor('uk')
    expect([uk.boost(1), uk.boost(3), uk.boost(5), uk.boost(21)]).toEqual([
      'Група отримала 1 буст',
      'Група отримала 3 бусти',
      'Група отримала 5 бустів',
      'Група отримала 21 буст',
    ])
    const ar = labelsFor('ar')
    expect(new Set([ar.boost(1), ar.boost(2), ar.boost(3), ar.boost(11)]).size).toBe(4)
    expect(labelsFor('ja').boost(1)).toBe('グループをブーストしました')
    expect(labelsFor('ja').boost(4)).toBe('グループを 4 回ブーストしました')
  })

  it('localizes a full line end to end', () => {
    const src = { from: alice, video_chat_ended: { duration: 2 * 3600 + 15 * 60 } }
    expect(serviceMessageLine(src, labelsFor('uk'))).toBe('📹 Відеочат завершено · 2 год 15 хв')
    expect(serviceMessageLine(src, labelsFor('de'))).toBe('📹 Videochat beendet · 2 Std. 15 Min.')
    expect(serviceMessageLine({ from: alice, new_chat_members: [user(2, 'Bob'), user(3, 'Eve')] }, labelsFor('ru'))).toBe('➕ Добавлено в группу: Bob, Eve')
  })
})

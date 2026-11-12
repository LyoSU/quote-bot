import type { ForumTopicEditedLike } from './topics'

/*
 * Group service notifications ("X joined", "video chat ended", "pinned a
 * message", …). They have no text/media of their own, so each is quoted as one
 * short localized line. The bubble still shows the sender (message.from — the
 * actor), so a line describes the action without repeating who did it.
 *
 * The Bot API shapes are structural (grammY's types may lag the Bot API).
 * `forum_topic_created` is deliberately absent: it is the topic root every
 * topic message "replies" to (topics.ts), not a quotable event.
 */

// ---- Bot API structural views -------------------------------------------------

interface UserLike {
  id?: number
  first_name?: string
  last_name?: string
  username?: string
}

/** A pinned message; an InaccessibleMessage carries neither text nor caption. */
interface PinnedMessageLike {
  text?: string
  caption?: string
}

/** Every service field this module reads off a message (native or server-fetched). */
export interface ServiceMessageSource {
  from?: { id?: number }
  new_chat_members?: UserLike[]
  left_chat_member?: UserLike
  new_chat_title?: string
  new_chat_photo?: unknown[]
  delete_chat_photo?: boolean
  group_chat_created?: boolean
  supergroup_chat_created?: boolean
  channel_chat_created?: boolean
  pinned_message?: PinnedMessageLike
  video_chat_scheduled?: { start_date?: number }
  video_chat_started?: object
  video_chat_ended?: { duration?: number }
  video_chat_participants_invited?: { users?: UserLike[] }
  message_auto_delete_timer_changed?: { message_auto_delete_time?: number }
  boost_added?: { boost_count?: number }
  chat_background_set?: object
  forum_topic_edited?: ForumTopicEditedLike
  forum_topic_closed?: object
  forum_topic_reopened?: object
  general_forum_topic_hidden?: object
  general_forum_topic_unhidden?: object
}

// ---- Labels -------------------------------------------------------------------

/** Localized strings for the service lines (Fluent `quote-service-*`, `quote-duration-*`). */
export interface ServiceLabels {
  joined: string
  /** "Added Alice, Bob +3" — `names` is the ready, capped list. */
  added: (names: string) => string
  left: string
  removed: (name: string) => string
  title: (title: string) => string
  photo: string
  photoRemoved: string
  groupCreated: string
  channelCreated: string
  pinned: string
  /** "Pinned «excerpt…»". */
  pinnedText: (text: string) => string
  /** The date is formatted by Fluent's DATETIME. */
  videoChatScheduled: (unix: number) => string
  /** A scheduled video chat with no usable start date. */
  videoChatScheduledSoon: string
  videoChatStarted: string
  videoChatEnded: string
  videoChatInvited: (names: string) => string
  /** A participants-invited notice with no readable names. */
  videoChatInvitedSome: string
  /** `duration` is a ready "1 d" / "2 h 15 min" string. */
  autoDelete: (duration: string) => string
  autoDeleteOff: string
  boost: (count: number) => string
  background: string
  topicRenamed: (name: string) => string
  topicIcon: string
  topicClosed: string
  topicReopened: string
  generalHidden: string
  generalUnhidden: string
  /** Abbreviated duration units: "3 d", "2 h", "15 min", "40 s". */
  days: (count: number) => string
  hours: (count: number) => string
  minutes: (count: number) => string
  seconds: (count: number) => string
}

export const DEFAULT_SERVICE_LABELS: ServiceLabels = {
  joined: 'Joined the group',
  added: (names) => `Added ${names}`,
  left: 'Left the group',
  removed: (name) => `Removed ${name}`,
  title: (title) => `Changed the group name to «${title}»`,
  photo: 'Changed the group photo',
  photoRemoved: 'Removed the group photo',
  groupCreated: 'Created the group',
  channelCreated: 'Created the channel',
  pinned: 'Pinned a message',
  pinnedText: (text) => `Pinned «${text}»`,
  videoChatScheduled: (unix) =>
    `Scheduled a video chat for ${new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`,
  videoChatScheduledSoon: 'Scheduled a video chat',
  videoChatStarted: 'Started a video chat',
  videoChatEnded: 'Video chat ended',
  videoChatInvited: (names) => `Invited ${names} to the video chat`,
  videoChatInvitedSome: 'Invited participants to the video chat',
  autoDelete: (duration) => `Set messages to auto-delete after ${duration}`,
  autoDeleteOff: 'Disabled auto-delete',
  boost: (n) => (n > 1 ? `Boosted the group ${n} times` : 'Boosted the group'),
  background: 'Changed the chat background',
  topicRenamed: (name) => `Renamed the topic to «${name}»`,
  topicIcon: 'Changed the topic icon',
  topicClosed: 'Closed the topic',
  topicReopened: 'Reopened the topic',
  generalHidden: 'Hid the General topic',
  generalUnhidden: 'Unhid the General topic',
  days: (n) => `${n} d`,
  hours: (n) => `${n} h`,
  minutes: (n) => `${n} min`,
  seconds: (n) => `${n} s`,
}

type Translate = (key: string, args?: Record<string, string | number>) => string

/** Builds the labels from a Fluent translator (counts stay numbers → plural rules + DATETIME). */
export function serviceLabelsFromTranslator(t: Translate): ServiceLabels {
  return {
    joined: t('quote-service-joined'),
    added: (names) => t('quote-service-added', { names }),
    left: t('quote-service-left'),
    removed: (name) => t('quote-service-removed', { name }),
    title: (title) => t('quote-service-title', { title }),
    photo: t('quote-service-photo'),
    photoRemoved: t('quote-service-photo-removed'),
    groupCreated: t('quote-service-group-created'),
    channelCreated: t('quote-service-channel-created'),
    pinned: t('quote-service-pinned'),
    pinnedText: (text) => t('quote-service-pinned-text', { text }),
    // Fluent's DATETIME takes epoch milliseconds.
    videoChatScheduled: (unix) => t('quote-service-video-scheduled', { date: unix * 1000 }),
    videoChatScheduledSoon: t('quote-service-video-scheduled-soon'),
    videoChatStarted: t('quote-service-video-started'),
    videoChatEnded: t('quote-service-video-ended'),
    videoChatInvited: (names) => t('quote-service-video-invited', { names }),
    videoChatInvitedSome: t('quote-service-video-invited-some'),
    autoDelete: (duration) => t('quote-service-auto-delete', { duration }),
    autoDeleteOff: t('quote-service-auto-delete-off'),
    boost: (count) => t('quote-service-boost', { count }),
    background: t('quote-service-background'),
    topicRenamed: (name) => t('quote-service-topic-renamed', { name }),
    topicIcon: t('quote-service-topic-icon'),
    topicClosed: t('quote-service-topic-closed'),
    topicReopened: t('quote-service-topic-reopened'),
    generalHidden: t('quote-service-general-hidden'),
    generalUnhidden: t('quote-service-general-unhidden'),
    days: (count) => t('quote-duration-days', { count }),
    hours: (count) => t('quote-duration-hours', { count }),
    minutes: (count) => t('quote-duration-minutes', { count }),
    seconds: (count) => t('quote-duration-seconds', { count }),
  }
}

// ---- Helpers ------------------------------------------------------------------

/** Names shown before the "+N" tail. */
export const MAX_SERVICE_NAMES = 3
const MAX_NAME_LENGTH = 24
const MAX_TITLE_LENGTH = 64
const MAX_EXCERPT_LENGTH = 40

/** Collapses whitespace and cuts to `max` code points (never splits a surrogate pair). */
function clip(text: string | undefined, max: number): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim()
  const points = Array.from(flat)
  return points.length > max ? `${points.slice(0, max - 1).join('').trimEnd()}…` : flat
}

const userName = (u: UserLike | undefined): string =>
  u ? clip([u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : ''), MAX_NAME_LENGTH) : ''

/** "Alice, Bob, Carol +2" — at most MAX_SERVICE_NAMES names; nameless users only count toward "+N". */
function userList(users: UserLike[] | undefined): string {
  const all = users ?? []
  const shown = all.map(userName).filter(Boolean).slice(0, MAX_SERVICE_NAMES)
  const extra = all.length - shown.length
  if (shown.length === 0) return ''
  return shown.join(', ') + (extra > 0 ? ` +${extra}` : '')
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Human duration from its two largest units: "3 d 4 h", "2 h 15 min",
 * "15 min", "40 s". Empty for a non-positive / malformed value.
 */
export function formatDuration(seconds: number | undefined, sl: ServiceLabels = DEFAULT_SERVICE_LABELS): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return ''
  const total = Math.floor(seconds)
  if (total < MINUTE) return sl.seconds(Math.max(1, total))
  const days = Math.floor(total / DAY)
  const hours = Math.floor((total % DAY) / HOUR)
  const minutes = Math.floor((total % HOUR) / MINUTE)
  const parts =
    days > 0
      ? [sl.days(days), hours > 0 ? sl.hours(hours) : '']
      : hours > 0
        ? [sl.hours(hours), minutes > 0 ? sl.minutes(minutes) : '']
        : [sl.minutes(minutes)]
  return parts.filter(Boolean).join(' ')
}

// ---- Public API -----------------------------------------------------------------

/** The one-line rendition of a group service notification, or undefined if it isn't one. */
export function serviceMessageLine(src: ServiceMessageSource, sl: ServiceLabels = DEFAULT_SERVICE_LABELS): string | undefined {
  if (src.new_chat_members?.length) {
    const members = src.new_chat_members
    // Joined by themselves (invite link / request) vs. added by someone else.
    const self = members.length === 1 && typeof src.from?.id === 'number' && members[0]?.id === src.from.id
    const names = userList(members)
    return self || !names ? `👋 ${sl.joined}` : `➕ ${sl.added(names)}`
  }
  if (src.left_chat_member) {
    const gone = src.left_chat_member
    const name = userName(gone)
    const self = typeof src.from?.id !== 'number' || gone.id === src.from.id
    return self || !name ? `🚪 ${sl.left}` : `🚫 ${sl.removed(name)}`
  }
  if (src.new_chat_title) return `✏️ ${sl.title(clip(src.new_chat_title, MAX_TITLE_LENGTH))}`
  if (src.new_chat_photo?.length) return `🖼 ${sl.photo}`
  if (src.delete_chat_photo) return `🗑 ${sl.photoRemoved}`
  if (src.group_chat_created || src.supergroup_chat_created) return `👥 ${sl.groupCreated}`
  if (src.channel_chat_created) return `📢 ${sl.channelCreated}`
  if (src.pinned_message) {
    const excerpt = clip(src.pinned_message.text || src.pinned_message.caption, MAX_EXCERPT_LENGTH)
    return `📌 ${excerpt ? sl.pinnedText(excerpt) : sl.pinned}`
  }
  if (src.video_chat_scheduled) {
    const at = src.video_chat_scheduled.start_date
    return `📹 ${typeof at === 'number' && at > 0 ? sl.videoChatScheduled(at) : sl.videoChatScheduledSoon}`
  }
  if (src.video_chat_started) return `📹 ${sl.videoChatStarted}`
  if (src.video_chat_ended) {
    const duration = formatDuration(src.video_chat_ended.duration, sl)
    return `📹 ${sl.videoChatEnded}${duration ? ` · ${duration}` : ''}`
  }
  if (src.video_chat_participants_invited) {
    const names = userList(src.video_chat_participants_invited.users)
    return `📹 ${names ? sl.videoChatInvited(names) : sl.videoChatInvitedSome}`
  }
  if (src.message_auto_delete_timer_changed) {
    const duration = formatDuration(src.message_auto_delete_timer_changed.message_auto_delete_time, sl)
    return `⏱ ${duration ? sl.autoDelete(duration) : sl.autoDeleteOff}`
  }
  if (src.boost_added) return `🚀 ${sl.boost(Math.max(1, Math.floor(src.boost_added.boost_count ?? 1) || 1))}`
  if (src.chat_background_set) return `🖼 ${sl.background}`
  if (src.forum_topic_edited) {
    const name = clip(src.forum_topic_edited.name, MAX_TITLE_LENGTH)
    return name ? `✏️ ${sl.topicRenamed(name)}` : `✏️ ${sl.topicIcon}`
  }
  if (src.forum_topic_closed) return `🔒 ${sl.topicClosed}`
  if (src.forum_topic_reopened) return `🔓 ${sl.topicReopened}`
  if (src.general_forum_topic_hidden) return `🙈 ${sl.generalHidden}`
  if (src.general_forum_topic_unhidden) return `👁 ${sl.generalUnhidden}`
  return undefined
}

/** True if the message is a service notification this module can describe. */
export function isServiceMessage(m: object): boolean {
  return serviceMessageLine(m as ServiceMessageSource) !== undefined
}

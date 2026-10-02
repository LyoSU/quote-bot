import type { MessageEntity } from 'grammy/types'

/** Kinds of text-less content that get a human label (reply blocks, locations, …). */
export const LABEL_KINDS = [
  'photo',
  'sticker',
  'voice',
  'video',
  'gif',
  'video_note',
  'document',
  'audio',
  'poll',
  'location',
  'contact',
  'story',
] as const
export type LabelKind = (typeof LABEL_KINDS)[number]

/** Localized strings the pure assembler needs — injected from ctx.t like roleLabels. */
export interface QuoteLabels {
  kinds: Record<LabelKind, string>
  /** "Forwarded from {name}" */
  forwardedFrom: (name: string) => string
  /** "Forwarded message" (original author unknown) */
  forwardedMessage: string
}

/** English defaults — used when a caller doesn't inject localized labels. */
export const DEFAULT_LABELS: QuoteLabels = {
  kinds: {
    photo: 'Photo',
    sticker: 'Sticker',
    voice: 'Voice message',
    video: 'Video',
    gif: 'GIF',
    video_note: 'Video message',
    document: 'Document',
    audio: 'Audio',
    poll: 'Poll',
    location: 'Location',
    contact: 'Contact',
    story: 'Story',
  },
  forwardedFrom: (name) => `Forwarded from ${name}`,
  forwardedMessage: 'Forwarded message',
}

/** Builds the label set from a translate function (Fluent keys `quote-kind-*`, `quote-forward-*`). */
export function labelsFromTranslator(t: (key: string, args?: Record<string, string>) => string): QuoteLabels {
  const kinds = {} as Record<LabelKind, string>
  for (const k of LABEL_KINDS) kinds[k] = t(`quote-kind-${k}`)
  return {
    kinds,
    forwardedFrom: (name) => t('quote-forward-from', { name }),
    forwardedMessage: t('quote-forward-message'),
  }
}

/** Structural view of the "special" content types that have no text/media of their own. */
export interface SpecialSource {
  poll?: { question: string; options?: { text: string }[] }
  dice?: { emoji: string; value?: number }
  location?: { latitude?: number; longitude?: number }
  venue?: { title?: string; address?: string }
  contact?: { first_name?: string; last_name?: string }
}

const MAX_POLL_OPTIONS = 6

export function hasSpecialContent(src: SpecialSource): boolean {
  return Boolean(src.poll || src.dice || src.venue || src.location || src.contact)
}

/**
 * Plain-text rendition of poll / dice / location / venue / contact messages, so
 * they quote as something meaningful instead of "unsupported". A dice is just
 * its emoji — the renderer shows a lone emoji big, like Telegram does.
 */
export function specialText(
  src: SpecialSource,
  labels: QuoteLabels = DEFAULT_LABELS,
): { text: string; entities?: MessageEntity[] } | undefined {
  if (src.dice?.emoji) return { text: src.dice.emoji }

  if (src.poll) {
    const head = '📊 '
    const options = (src.poll.options ?? []).slice(0, MAX_POLL_OPTIONS).map((o) => `• ${o.text}`)
    const extra = (src.poll.options?.length ?? 0) - options.length
    if (extra > 0) options.push('…')
    const text = [head + src.poll.question, ...options].join('\n')
    const bold: MessageEntity[] = src.poll.question
      ? [{ type: 'bold', offset: head.length, length: src.poll.question.length }]
      : []
    return { text, entities: bold }
  }

  if (src.venue) {
    const title = src.venue.title || labels.kinds.location
    const text = ['📍 ' + title, src.venue.address].filter(Boolean).join('\n')
    return { text }
  }
  if (src.location) return { text: `📍 ${labels.kinds.location}` }

  if (src.contact) {
    const name = [src.contact.first_name, src.contact.last_name].filter(Boolean).join(' ')
    return { text: `👤 ${name || labels.kinds.contact}` }
  }
  return undefined
}

import type { QuoteMessage, QuoteMessageFrom } from '../../services/quote-api/types'

export interface QuoteAuthor {
  telegram_id?: number
  first_name?: string
  last_name?: string
  username?: string | null
  title?: string
  name: string
}

export interface DenormalizedSource {
  date: Date
  chat_id?: number
  message_ids?: number[]
}

export interface DenormalizedQuote {
  authors: QuoteAuthor[]
  hasVoice: boolean
  hasMedia: boolean
  messageCount: number
  source: DenormalizedSource
}

export interface DenormalizeContext {
  chat?: { id: number }
  reply_to_message?: { date?: number }
}

/** Display name fallback (non-first-in-streak messages set `name = false`). */
function pickDisplayName(from: QuoteMessageFrom | undefined): string | null {
  if (!from) return null
  if (from.first_name) return [from.first_name, from.last_name].filter(Boolean).join(' ')
  if (typeof from.name === 'string') return from.name
  return null
}

/**
 * Derives read-optimized fields from the rendered quoteMessages, stored once at
 * Quote.create time. Ported from the legacy denormalize-quote util.
 */
export function denormalizeQuote(
  messages: QuoteMessage[],
  ctxMessage: DenormalizeContext,
  { privacy = false }: { privacy?: boolean } = {},
): DenormalizedQuote {
  let hasVoice = false
  let hasMedia = false

  for (const m of messages) {
    if (m.voice) hasVoice = true
    if (m.media) hasMedia = true
    if (m.replyMessage?.media) {
      if (m.replyMessage.media.kind === 'voice') hasVoice = true
      else hasMedia = true
    }
  }

  const firstDateUnix = messages.find((m) => typeof m.date === 'number')?.date
  const replyDateUnix = ctxMessage.reply_to_message?.date
  const source: DenormalizedSource = {
    date: firstDateUnix
      ? new Date(firstDateUnix * 1000)
      : replyDateUnix
        ? new Date(replyDateUnix * 1000)
        : new Date(),
  }

  const authors: QuoteAuthor[] = []

  if (!privacy) {
    const seen = new Set<string>()
    const addAuthor = (entry: QuoteAuthor, key: string): void => {
      if (seen.has(key)) return
      seen.add(key)
      authors.push(entry)
    }

    for (const m of messages) {
      const from = m.from
      const name = pickDisplayName(from)
      if (name) {
        const key = from?.id != null ? `id:${from.id}` : `name:${name}`
        addAuthor(
          {
            telegram_id: from?.id,
            first_name: from?.first_name,
            last_name: from?.last_name,
            username: from?.username,
            name,
          },
          key,
        )
      }

      const fwd = m.forward
      if (fwd?.name) {
        const fwdId = typeof fwd.from?.id === 'number' ? fwd.from.id : undefined
        const fwdKey = fwdId != null ? `id:${fwdId}` : `name:${fwd.name}`
        addAuthor(
          {
            telegram_id: fwdId,
            username: fwd.from?.username,
            title: fwd.from?.kind === 'chat' ? fwd.name : undefined,
            name: fwd.name,
          },
          fwdKey,
        )
      }
    }

    if (ctxMessage.chat) source.chat_id = ctxMessage.chat.id
    source.message_ids = messages.map((m) => m.message_id).filter((id): id is number => Boolean(id))
  }

  return { authors, hasVoice, hasMedia, messageCount: messages.length, source }
}

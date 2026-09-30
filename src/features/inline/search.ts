/** Archived content only; author fields deliberately exclude raw private payload identities. */
const SEARCH_FIELDS = [
  'text', // Quotes archived by older versions used a top-level text field.
  'payload.messages.text',
  'payload.messages.replyMessage.text',
  'authors.name',
  'authors.first_name',
  'authors.last_name',
  'authors.username',
  'authors.title',
] as const

export interface InlineSearch {
  scope: 'liked' | 'top' | 'find'
  groupId?: string
  text: string
}

/** Group scope comes only from the explicit query prefix, never the inline chat. */
export function parseInlineSearch(query: string): InlineSearch {
  const trimmed = query.trim()
  const group = trimmed.match(/^(top|find):([a-fA-F\d]{24})(?:\s+(.*))?$/s)
  return group
    ? { scope: group[1] as 'top' | 'find', groupId: group[2], text: (group[3] ?? '').trim() }
    : { scope: 'liked', text: trimmed }
}

/**
 * Literal, case-insensitive substring matching. All query words must match,
 * but each can occur in a different message or author field of the quote.
 * Always combine with a liked-user or group filter; this is not a global search.
 */
export function inlineWordFilter(text: string) {
  const words = [...new Set(text.trim().split(/\s+/u).filter(Boolean))]
  if (words.length === 0) return {}

  return {
    file_id: { $type: 'string' as const, $ne: '' },
    forgottenAt: { $exists: false },
    $and: words.map((word) => ({
      $or: SEARCH_FIELDS.map((field) => ({
        [field]: { $regex: word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      })),
    })),
  }
}

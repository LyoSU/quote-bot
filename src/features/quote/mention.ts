import type { MessageEntity } from 'grammy/types'
import { parseQuoteArgs } from './parse-args'

/**
 * The group `@bot` alias for `/q`: a message that consists of nothing but a
 * mention of the bot plus optional `/q` flags ("@bot", "@bot 3 r", "@bot red").
 *
 * Returns the flag string (possibly empty) when the message is such a bare
 * mention, or `null` when it isn't — i.e. the bot is not mentioned, or the
 * text carries tokens the flag parser doesn't recognize (ordinary chatter
 * that merely names the bot must never summon a quote).
 */
export function bareMentionArgs(
  text: string,
  entities: MessageEntity[] | undefined,
  username: string | undefined,
): string | null {
  if (!username || !entities) return null

  const lowerName = username.toLowerCase()
  const mentioned = entities.some(
    (e) =>
      e.type === 'mention' &&
      text.slice(e.offset + 1, e.offset + e.length).toLowerCase() === lowerName,
  )
  if (!mentioned) return null

  // Usernames are [A-Za-z0-9_] — safe to inline into a regex.
  const rest = text.replace(new RegExp(`@${username}\\b`, 'ig'), ' ').trim()
  if (rest === '') return ''

  const parsed = parseQuoteArgs(rest)
  return parsed.unknown.length === 0 ? rest : null
}

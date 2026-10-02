import { config } from '../config/env'

/**
 * Telegram Mini App deep links:
 *   https://t.me/<bot_username>/<short_name>?startapp=<payload>
 * The payload arrives in the webapp as `start_param`.
 */
function baseUrl(botUsername: string): string {
  if (config.MINI_APP_URL) return config.MINI_APP_URL
  return `https://t.me/${botUsername}/${config.MINI_APP_SHORT_NAME}`
}

function build(botUsername: string, startParam?: string): string {
  const base = baseUrl(botUsername)
  return startParam ? `${base}?startapp=${startParam}` : base
}

export function forRoot(botUsername: string): string {
  return build(botUsername)
}

export function forGroup(botUsername: string, groupObjectId?: string): string {
  return groupObjectId ? build(botUsername, `g_${groupObjectId}`) : build(botUsername)
}

export function forQuote(botUsername: string, groupObjectId?: string, localId?: number | null): string {
  if (!groupObjectId || localId == null) return build(botUsername)
  return build(botUsername, `q_${localId}_g_${groupObjectId}`)
}

/** Telegram caps `startapp` at 64 chars of [A-Za-z0-9_-]; anything else is dropped. */
const SAFE_PARAM = /^[A-Za-z0-9_-]{1,64}$/

function withId(botUsername: string, prefix: string, groupObjectId?: string): string {
  const param = groupObjectId ? `${prefix}_${groupObjectId}` : prefix
  return SAFE_PARAM.test(param) ? build(botUsername, param) : build(botUsername)
}

/** Group hall of fame (top quotes). */
export function forTop(botUsername: string, groupObjectId: string): string {
  return withId(botUsername, 'top', groupObjectId)
}

/** "Guess the author" game for a group. */
export function forGame(botUsername: string, groupObjectId: string): string {
  return withId(botUsername, 'game', groupObjectId)
}

/** Settings preview: a group's, or the personal ones when no group is given. */
export function forSettings(botUsername: string, groupObjectId?: string): string {
  return withId(botUsername, 'settings', groupObjectId)
}

export const deepLink = { forRoot, forGroup, forQuote, forTop, forGame, forSettings }

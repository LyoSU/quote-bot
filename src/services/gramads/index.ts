import { config } from '../../config/env'
import { logger } from '../../core/logger'

const log = logger.child({ module: 'gramads' })

const ENDPOINT = 'https://api.gramads.net/ad/SendPost'
const TIMEOUT_MS = 10_000

/**
 * Sends a gramads sponsored post to a user. Best-effort and fire-and-forget:
 * any failure is logged at debug and swallowed so it never affects the quote
 * flow. Gating (ru-locale + private chat only) is the caller's responsibility.
 */
export async function sendGramadsAd(chatId: number): Promise<void> {
  const token = config.GRAMADS_TOKEN
  if (!token) return

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `bearer ${token}` },
      body: JSON.stringify({ SendToChatId: chatId }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) log.debug({ status: res.status, chatId }, 'gramads non-OK response')
  } catch (err) {
    log.debug({ err, chatId }, 'gramads request failed')
  }
}

/** Whether ads should be shown for this locale (ru only, per product decision). */
export function shouldShowAds(locale: string | undefined): boolean {
  return Boolean(config.GRAMADS_TOKEN) && locale === 'ru'
}

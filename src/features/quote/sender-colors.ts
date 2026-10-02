import type { Api } from 'grammy'
import { LruCache } from '../../core/lru'
import type { QuoteSenderColors } from '../../services/quote-api/types'
import { isSyntheticId } from './sender'

const COLORS_TTL_MS = 30 * 60 * 1000
const COLORS_CACHE_MAX = 5_000
const LOOKUP_TIMEOUT_MS = 3_000

type ColorsApi = Pick<Api, 'getChat'>

interface ColorsEntry {
  /** Settled result, or the in-flight lookup (so concurrent callers share one call). */
  colors: Promise<QuoteSenderColors | undefined>
}

/** Shared across quotes: the same people reappear constantly in a chat. */
const colorsCache = new LruCache<number, ColorsEntry>(COLORS_CACHE_MAX, COLORS_TTL_MS)

/** Test hook. */
export function clearSenderColorsCache(): void {
  colorsCache.clear()
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('colors lookup timed out')), ms)
  })
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer))
}

async function lookup(api: ColorsApi, id: number): Promise<QuoteSenderColors | undefined> {
  // ChatFullInfo carries the profile colors for users and chats alike.
  const chat = (await api.getChat(id)) as { accent_color_id?: number; background_custom_emoji_id?: string }
  const out: QuoteSenderColors = {}
  if (typeof chat.accent_color_id === 'number') out.accentColorId = chat.accent_color_id
  if (chat.background_custom_emoji_id) out.backgroundEmojiId = chat.background_custom_emoji_id
  return out.accentColorId === undefined && out.backgroundEmojiId === undefined ? undefined : out
}

/**
 * Resolves a sender's Telegram profile accent color (and background emoji) for
 * the renderer's name color and reply chip — messages never carry it, so it
 * takes a getChat. Cached 30 min (bounded), shares in-flight lookups, times
 * out after 3 s and never throws: no colors just means the renderer's id-based
 * fallback color. Errors/timeouts are not cached. Synthetic ids are skipped.
 */
export function resolveSenderColors(
  api: ColorsApi,
  id: number,
  timeoutMs = LOOKUP_TIMEOUT_MS,
): Promise<QuoteSenderColors | undefined> {
  if (!Number.isFinite(id) || id === 0 || isSyntheticId(id)) return Promise.resolve(undefined)

  const hit = colorsCache.get(id)
  if (hit) return hit.colors

  let failed = false
  const colors = withTimeout(lookup(api, id), timeoutMs).catch(() => {
    failed = true
    return undefined
  })
  colorsCache.set(id, { colors })
  void colors.then(() => {
    if (failed) colorsCache.delete(id)
  })
  return colors
}

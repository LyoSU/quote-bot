import { LruCache } from '../../core/lru'
import { Group } from '../../db/models'
import { logger } from '../../core/logger'

const log = logger.child({ module: 'gab' })

/** Minimum gap between two auto-quotes in the same group. */
const COOLDOWN_MS = 60_000
/** How long a speaker counts as "currently in the conversation". */
const ACTIVITY_WINDOW_MS = 5 * 60_000
/** Don't fire into a dead chat or a one-person monologue. */
const MIN_ACTIVE_SPEAKERS = 2
/** Cached gab config lifetime before we re-read it from the group doc. */
const STATE_TTL_MS = 30 * 60_000
/** Per-group activity map size guard. */
const MAX_TRACKED_PER_GROUP = 256

interface GabState {
  /** `randomQuoteGab` — expected ~1-in-N chance per qualifying message. 0 = off. */
  gab: number
  /** Last time we fired (ms epoch); seeded from the persisted `lastRandomQuote`. */
  lastFiredAt: number
}

/** gab config per group (telegram id), lazily loaded and TTL-refreshed. */
const stateCache = new LruCache<number, GabState>(20_000, STATE_TTL_MS)
const loading = new Set<number>()

/** Recent speakers per group: telegram chat id → (telegram user id → last seen ms). */
const activity = new LruCache<number, Map<number, number>>(20_000, ACTIVITY_WINDOW_MS * 2)

function scheduleLoad(chatId: number): void {
  if (loading.has(chatId)) return
  loading.add(chatId)
  void Group.findOne({ group_id: chatId })
    .select('settings.randomQuoteGab lastRandomQuote')
    .lean<{ settings?: { randomQuoteGab?: number }; lastRandomQuote?: Date }>()
    .then((g) => {
      stateCache.set(chatId, {
        gab: g?.settings?.randomQuoteGab ?? 0,
        lastFiredAt: g?.lastRandomQuote ? g.lastRandomQuote.getTime() : 0,
      })
    })
    .catch((err) => log.debug({ err, chatId }, 'gab state load failed'))
    .finally(() => loading.delete(chatId))
}

/**
 * Records that a human spoke in a group. O(1), called from the fast-path's
 * noise branch — this is the only place that observes the chatter we otherwise
 * drop, which is exactly what makes the "author is present" trick cheap.
 */
export function recordActivity(chatId: number, userId: number): void {
  let map = activity.get(chatId)
  if (!map) {
    map = new Map()
    activity.set(chatId, map)
  }
  map.set(userId, Date.now())
  if (map.size > MAX_TRACKED_PER_GROUP) {
    const cutoff = Date.now() - ACTIVITY_WINDOW_MS
    for (const [id, ts] of map) if (ts < cutoff) map.delete(id)
  }
}

/** Telegram ids of users active within the activity window. */
export function activeSpeakers(chatId: number): number[] {
  const map = activity.get(chatId)
  if (!map) return []
  const cutoff = Date.now() - ACTIVITY_WINDOW_MS
  const ids: number[] = []
  for (const [id, ts] of map) if (ts >= cutoff) ids.push(id)
  return ids
}

/** Count of active speakers, short-circuiting at `stopAt` without allocating. */
function activeSpeakerCount(chatId: number, stopAt: number): number {
  const map = activity.get(chatId)
  if (!map) return 0
  const cutoff = Date.now() - ACTIVITY_WINDOW_MS
  let n = 0
  for (const ts of map.values()) {
    if (ts >= cutoff && ++n >= stopAt) break
  }
  return n
}

/**
 * Cheap O(1) decision made on the hot path: should this group message trigger
 * an auto-quote? True at most ~once per cooldown per group, and only when the
 * chat is lively (≥{@link MIN_ACTIVE_SPEAKERS} recent speakers). On a true
 * result we optimistically stamp `lastFiredAt` so a burst can't double-fire.
 */
export function considerGab(chatId: number): boolean {
  const st = stateCache.get(chatId)
  if (!st) {
    scheduleLoad(chatId)
    return false
  }
  if (st.gab <= 0) return false

  const now = Date.now()
  if (now - st.lastFiredAt < COOLDOWN_MS) return false
  if (activeSpeakerCount(chatId, MIN_ACTIVE_SPEAKERS) < MIN_ACTIVE_SPEAKERS) return false
  if (Math.floor(Math.random() * st.gab) !== 0) return false

  st.lastFiredAt = now
  return true
}

/** Persists the fire time so the cooldown survives restarts. */
export function rememberFired(chatId: number): void {
  const st = stateCache.get(chatId)
  if (st) st.lastFiredAt = Date.now()
}

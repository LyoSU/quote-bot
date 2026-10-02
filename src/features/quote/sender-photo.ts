import type { Api } from 'grammy'
import { LruCache } from '../../core/lru'
import type { QuoteFromPhoto } from '../../services/quote-api/types'
import { isSyntheticId } from './sender'

const PHOTO_TTL_MS = 30 * 60 * 1000
const PHOTO_CACHE_MAX = 5_000
const LOOKUP_TIMEOUT_MS = 3_000

type PhotoApi = Pick<Api, 'getUserProfilePhotos' | 'getChat'>

interface PhotoEntry {
  /** Settled result, or the in-flight lookup (so concurrent callers share one call). */
  photo: Promise<QuoteFromPhoto | undefined>
}

/** Shared across quotes: avatars repeat constantly in a chat. */
const photoCache = new LruCache<number, PhotoEntry>(PHOTO_CACHE_MAX, PHOTO_TTL_MS)

/** Test hook. */
export function clearSenderPhotoCache(): void {
  photoCache.clear()
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('photo lookup timed out')), ms)
  })
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer))
}

async function lookup(api: PhotoApi, id: number): Promise<QuoteFromPhoto | undefined> {
  if (id > 0) {
    // The photo's largest size; `photos[0]` is the current profile picture.
    const { photos } = await api.getUserProfilePhotos(id, { limit: 1 })
    const sizes = photos[0]
    if (!sizes?.length) return undefined
    let best = sizes[0]!
    for (const s of sizes) if (s.width * s.height >= best.width * best.height) best = s
    return { big_file_id: best.file_id }
  }
  const chat = await api.getChat(id)
  const big = 'photo' in chat ? chat.photo?.big_file_id : undefined
  return big ? { big_file_id: big } : undefined
}

/**
 * Resolves a user's (positive id) or chat/channel's (negative id) profile photo
 * file id for the renderer — Telegram never ships it on messages. Cached for
 * 30 min (bounded), shares in-flight lookups, times out after 3 s and never
 * throws: no photo just means the renderer draws the initials avatar (or tries
 * its own lookup). Synthetic ids are skipped.
 */
export function resolveSenderPhoto(
  api: PhotoApi,
  id: number,
  timeoutMs = LOOKUP_TIMEOUT_MS,
): Promise<QuoteFromPhoto | undefined> {
  if (!Number.isFinite(id) || id === 0 || isSyntheticId(id)) return Promise.resolve(undefined)

  const hit = photoCache.get(id)
  if (hit) return hit.photo

  let failed = false
  const photo = withTimeout(lookup(api, id), timeoutMs).catch(() => {
    failed = true
    return undefined
  })
  const entry: PhotoEntry = { photo }
  photoCache.set(id, entry)
  // A timeout/error must not pin "no photo" for 30 minutes — drop it so the next quote retries.
  void photo.then(() => {
    if (failed) photoCache.delete(id)
  })
  return photo
}

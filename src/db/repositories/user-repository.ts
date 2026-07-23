import type { User as TelegramUser } from 'grammy/types'
import type { UpdateQuery } from 'mongoose'
import { User, type UserDoc } from '../models/user'
import { logger } from '../../core/logger'
import { LruCache } from '../../core/lru'
import { contextCacheTotal } from '../../core/metrics'

const log = logger.child({ module: 'user-repo' })

/**
 * Hot-lookup cache — contextMiddleware resolves the sender on every relevant
 * update, and the same users message far more often than their rows change.
 *
 * Freshness is owned by delete-on-write in the helpers below: every User write
 * in the codebase flows through this module, so nothing can bypass the cache.
 * The fixed TTL (no touch-on-read) is only a backstop — even a continuously
 * active user re-reads once a minute. Capacity comes from hot-set math: at
 * ~50 relevant updates/s a 60s window holds ~3k distinct senders.
 */
const userCache = new LruCache<number, UserDoc>(10_000, 60_000)

function buildFullName(from: TelegramUser): string {
  return from.last_name ? `${from.first_name} ${from.last_name}` : from.first_name
}

/**
 * Resolves the User row for an incoming sender, creating it on first contact.
 * Returns a plain (lean) object — handlers read it; writes go through the
 * targeted helpers below, never through a full-document save.
 *
 * Creation is an atomic upsert: sequentialize orders updates per *chat*, so
 * the same new user active in two chats races — a find-then-insert threw
 * E11000 on the telegram_id index and killed the losing update.
 */
export async function getOrCreateUser(from: TelegramUser, isPrivate: boolean): Promise<UserDoc> {
  const cached = userCache.get(from.id)
  if (cached) {
    contextCacheTotal.inc({ entity: 'user', outcome: 'hit' })
    void syncUserProfile(cached, from)
    return cached
  }
  contextCacheTotal.inc({ entity: 'user', outcome: 'miss' })

  const existing = await User.findOne({ telegram_id: from.id }).lean<UserDoc>()
  if (existing) {
    userCache.set(from.id, existing)
    void syncUserProfile(existing, from)
    return existing
  }

  try {
    const created = await User.findOneAndUpdate(
      { telegram_id: from.id },
      {
        $setOnInsert: {
          telegram_id: from.id,
          first_name: from.first_name,
          last_name: from.last_name,
          full_name: buildFullName(from),
          username: from.username,
          ...(isPrivate ? { status: 'member' } : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean<UserDoc>()

    // upsert + new:true guarantees a document.
    userCache.set(from.id, created as UserDoc)
    return created as UserDoc
  } catch (err) {
    // Mongo < 4.2 can still surface E11000 when two upserts race. The winner's
    // document exists by now, so one re-read settles it.
    if ((err as { code?: number }).code !== 11000) throw err
    const winner = await User.findOne({ telegram_id: from.id }).lean<UserDoc>()
    if (!winner) throw err
    userCache.set(from.id, winner)
    return winner
  }
}

/**
 * Fire-and-forget profile sync: keeps name/username fresh when Telegram data
 * changes. Write-on-change — the incoming update carries the current profile,
 * so the comparison is free and the write only happens on an actual change.
 * On success the doc is patched in place: it is the cached copy, so the cache
 * stays fresh without a refetch.
 */
export async function syncUserProfile(user: UserDoc, from: TelegramUser): Promise<void> {
  const fullName = buildFullName(from)
  const changed =
    user.first_name !== from.first_name ||
    user.last_name !== (from.last_name ?? undefined) ||
    user.username !== (from.username ?? undefined) ||
    user.full_name !== fullName

  if (!changed) return

  try {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          first_name: from.first_name,
          last_name: from.last_name,
          full_name: fullName,
          username: from.username,
        },
      },
    )
    user.first_name = from.first_name
    user.last_name = from.last_name ?? undefined
    user.username = from.username ?? undefined
    user.full_name = fullName
  } catch (err) {
    log.warn({ err, telegramId: from.id }, 'User profile sync failed')
  }
}

/**
 * Persists one or more settings changes. Pass dotted Mongo paths, e.g.
 * `{ 'settings.privacy': true }`. Takes the resolved doc (not a bare _id) so
 * the cache entry can be invalidated — the next update re-reads the row.
 */
export async function updateUserSettings(
  user: Pick<UserDoc, '_id' | 'telegram_id'>,
  $set: UpdateQuery<UserDoc>['$set'],
): Promise<void> {
  await User.updateOne({ _id: user._id }, { $set })
  userCache.delete(user.telegram_id)
}

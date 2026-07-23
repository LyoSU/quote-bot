import type { Types } from 'mongoose'
import { GroupMember } from './models/group-member'
import { LruCache } from '../core/lru'
import { logger } from '../core/logger'

const log = logger.child({ module: 'member-tracker' })

/**
 * Bounded dedup of (group, user) pairs we've already recorded, so we don't
 * re-issue an upsert for every interaction by the same member. 6h TTL keeps the
 * set small while still catching genuinely new members promptly.
 */
const seen = new LruCache<string, true>(50_000, 6 * 60 * 60 * 1000)

/**
 * Records that a user was seen in a group ("first seen" membership signal).
 * Fire-and-forget and idempotent (the unique index dedups races); never blocks
 * the update being handled.
 */
export function trackMember(groupId: Types.ObjectId, telegramId: number): void {
  const key = `${groupId.toString()}:${telegramId}`
  if (seen.get(key)) return
  seen.set(key, true)

  void GroupMember.updateOne(
    { telegram_id: telegramId, group: groupId },
    { $setOnInsert: { telegram_id: telegramId, group: groupId, firstSeenAt: new Date() } },
    { upsert: true },
  ).catch((err: { code?: number }) => {
    if (err?.code === 11000) return // duplicate under race — the row exists, fine
    seen.delete(key) // real failure: allow a retry on the next interaction
    log.warn({ err, telegramId }, 'GroupMember upsert failed')
  })
}

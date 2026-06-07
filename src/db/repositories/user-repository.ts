import type { User as TelegramUser } from 'grammy/types'
import type { UpdateQuery, Types } from 'mongoose'
import { User, type UserDoc } from '../models/user'
import { logger } from '../../core/logger'

const log = logger.child({ module: 'user-repo' })

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
  const existing = await User.findOne({ telegram_id: from.id }).lean<UserDoc>()
  if (existing) {
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
    return created as UserDoc
  } catch (err) {
    // Mongo < 4.2 can still surface E11000 when two upserts race. The winner's
    // document exists by now, so one re-read settles it.
    if ((err as { code?: number }).code !== 11000) throw err
    const winner = await User.findOne({ telegram_id: from.id }).lean<UserDoc>()
    if (!winner) throw err
    return winner
  }
}

/**
 * Fire-and-forget profile sync: keeps name/username fresh when Telegram data
 * changes. Targeted $set so it never races with concurrent settings writes.
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
  } catch (err) {
    log.warn({ err, telegramId: from.id }, 'User profile sync failed')
  }
}

/**
 * Persists one or more settings changes. Pass dotted Mongo paths, e.g.
 * `{ 'settings.privacy': true }`.
 */
export async function updateUserSettings(
  userId: Types.ObjectId,
  $set: UpdateQuery<UserDoc>['$set'],
): Promise<void> {
  await User.updateOne({ _id: userId }, { $set })
}

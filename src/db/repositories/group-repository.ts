import type { Chat } from 'grammy/types'
import type { UpdateQuery, Types } from 'mongoose'
import { Group, type GroupDoc } from '../models/group'
import { logger } from '../../core/logger'
import { LruCache } from '../../core/lru'
import { contextCacheTotal } from '../../core/metrics'

const log = logger.child({ module: 'group-repo' })

type GroupChat = Chat.GroupChat | Chat.SupergroupChat

/**
 * Hot-lookup cache — same contract as the user cache (see user-repository):
 * delete-on-write in the helpers below owns freshness, the fixed 60s TTL is a
 * backstop. Groups are fewer than users; sequentialize additionally serializes
 * per chat, so this cache is effectively race-free.
 */
const groupCache = new LruCache<number, GroupDoc>(5_000, 60_000)

/**
 * Resolves (and upserts) the Group row for a chat. Uses an atomic
 * findOneAndUpdate so the row always exists for subsequent $inc operations
 * (quoteCounter, etc.) — and never via a racy full-document save.
 */
export async function getOrCreateGroup(chat: GroupChat): Promise<GroupDoc> {
  const cached = groupCache.get(chat.id)
  if (cached) {
    contextCacheTotal.inc({ entity: 'group', outcome: 'hit' })
    void syncGroupProfile(cached, chat)
    return cached
  }
  contextCacheTotal.inc({ entity: 'group', outcome: 'miss' })

  const group = (await Group.findOneAndUpdate(
    { group_id: chat.id },
    {
      $set: {
        title: chat.title,
        username: 'username' in chat ? chat.username : undefined,
        updatedAt: new Date(),
      },
      $setOnInsert: { group_id: chat.id },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
    // upsert + new:true guarantees a document.
  ).lean<GroupDoc>()) as GroupDoc

  groupCache.set(chat.id, group)
  return group
}

/**
 * Write-on-change title/username sync (mirrors syncUserProfile): Telegram
 * sends the current chat profile with every message, so the incoming update
 * doubles as the change signal — the old unconditional $set was one write per
 * relevant group update. On success the doc is patched in place: it is the
 * cached copy, so the cache stays fresh without a refetch.
 */
async function syncGroupProfile(group: GroupDoc, chat: GroupChat): Promise<void> {
  const username = 'username' in chat ? chat.username : undefined
  if (group.title === chat.title && group.username === username) return

  try {
    await Group.updateOne(
      { _id: group._id },
      { $set: { title: chat.title, username, updatedAt: new Date() } },
    )
    group.title = chat.title
    group.username = username
  } catch (err) {
    log.warn({ err, chatId: chat.id }, 'Group profile sync failed')
  }
}

/**
 * Persists one or more group settings changes via a targeted `$set` (dotted
 * Mongo paths, e.g. `{ 'settings.privacy': true }`) — never a full-doc save.
 * Takes the resolved doc (not a bare _id) so the cache entry can be
 * invalidated — the next update re-reads the row.
 */
export async function updateGroupSettings(
  group: Pick<GroupDoc, '_id' | 'group_id'>,
  $set: UpdateQuery<GroupDoc>['$set'],
): Promise<void> {
  await Group.updateOne({ _id: group._id }, { $set })
  groupCache.delete(group.group_id)
}

/** Sets (or clears) the group's sticker pack short name. Invalidates the cache. */
export async function setGroupStickerSet(
  group: Pick<GroupDoc, '_id' | 'group_id'>,
  name: string | null,
): Promise<void> {
  if (name) await Group.updateOne({ _id: group._id }, { $set: { 'stickerSet.name': name, 'stickerSet.create': true } })
  else await Group.updateOne({ _id: group._id }, { $unset: { stickerSet: 1 } })
  groupCache.delete(group.group_id)
}

/**
 * Atomically bumps the per-group quote counter and returns the new value.
 * Deliberately does NOT invalidate the cache: the counter is consumed from the
 * return value, never read back through ctx.group — and invalidating here
 * would evict every active group on every quote, gutting the hit rate.
 */
export async function incrementQuoteCounter(groupId: Types.ObjectId): Promise<number> {
  const updated = await Group.findOneAndUpdate(
    { _id: groupId },
    { $inc: { quoteCounter: 1 } },
    { new: true },
  )
    .select('quoteCounter')
    .lean<{ quoteCounter: number }>()

  return updated?.quoteCounter ?? 0
}

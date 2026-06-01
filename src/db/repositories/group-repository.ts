import type { Chat } from 'grammy/types'
import type { UpdateQuery, Types } from 'mongoose'
import { Group, type GroupDoc } from '../models/group'

type GroupChat = Chat.GroupChat | Chat.SupergroupChat

/**
 * Resolves (and upserts) the Group row for a chat. Uses an atomic
 * findOneAndUpdate so the row always exists for subsequent $inc operations
 * (quoteCounter, etc.) — and never via a racy full-document save.
 */
export async function getOrCreateGroup(chat: GroupChat): Promise<GroupDoc> {
  const group = await Group.findOneAndUpdate(
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
  ).lean<GroupDoc>()

  // upsert + new:true guarantees a document.
  return group as GroupDoc
}

/**
 * Persists one or more group settings changes via a targeted `$set` (dotted
 * Mongo paths, e.g. `{ 'settings.privacy': true }`) — never a full-doc save.
 */
export async function updateGroupSettings(
  groupId: Types.ObjectId,
  $set: UpdateQuery<GroupDoc>['$set'],
): Promise<void> {
  await Group.updateOne({ _id: groupId }, { $set })
}

/** Sets (or clears) the group's sticker pack short name. */
export async function setGroupStickerSet(groupId: Types.ObjectId, name: string | null): Promise<void> {
  if (name) await Group.updateOne({ _id: groupId }, { $set: { 'stickerSet.name': name, 'stickerSet.create': true } })
  else await Group.updateOne({ _id: groupId }, { $unset: { stickerSet: 1 } })
}

/** Atomically bumps the per-group quote counter and returns the new value. */
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

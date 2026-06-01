import { Composer, GrammyError, InputFile } from 'grammy'
import type { InputSticker, Message, PhotoSize } from 'grammy/types'
import { randomUUID } from 'node:crypto'
import type { BotContext } from '../../core/types'
import { onlyAdmin, onlyGroup } from '../../middlewares/guards'
import { Quote } from '../../db/models'
import { setGroupStickerSet } from '../../db/repositories/group-repository'
import { downloadTelegramFile, StickerTooLargeError, toStickerWebp } from './image'

const STICKER_LINK = 'https://t.me/addstickers/'

export const fstikFeature = new Composer<BotContext>()

function replyHtml(ctx: BotContext, text: string): Promise<unknown> {
  const messageId = ctx.message?.message_id
  return ctx
    .reply(text, {
      parse_mode: 'HTML',
      ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}),
    })
    .catch(() => undefined)
}

/** Picks the saveable source file from a replied message (sticker/photo/image doc). */
function pickStickerSource(
  reply: Message,
): { fileId: string; emoji?: string; animated: boolean } | null {
  if (reply.sticker) {
    return {
      fileId: reply.sticker.file_id,
      emoji: reply.sticker.emoji,
      animated: reply.sticker.is_animated || reply.sticker.is_video,
    }
  }
  if (reply.photo) {
    const largest = reply.photo.reduce<PhotoSize | undefined>((a, b) => (!a || b.width > a.width ? b : a), undefined)
    if (largest) return { fileId: largest.file_id, emoji: reply.caption, animated: false }
  }
  if (reply.document && (reply.document.mime_type === 'image/jpeg' || reply.document.mime_type === 'image/png')) {
    return { fileId: reply.document.file_id, animated: false }
  }
  return null
}

/** Builds a 1–20 emoji list for the new sticker (arg + source emoji + 🌟). */
function buildEmojiList(arg: string | undefined, sourceEmoji: string | undefined): string[] {
  const raw = `${arg ?? ''}${sourceEmoji ?? ''}`
  const found = raw.match(/\p{Extended_Pictographic}/gu) ?? []
  const list = [...new Set([...found, '🌟'])].slice(0, 20)
  return list.length > 0 ? list : ['🌟']
}

/** Telegram requires the set owner's user id; prefer the group creator. */
async function resolvePackOwner(ctx: BotContext): Promise<number | undefined> {
  if (!ctx.from) return undefined
  try {
    const admins = await ctx.getChatAdministrators()
    const creator = admins.find((a) => a.status === 'creator')
    return creator?.user.id ?? ctx.from.id
  } catch {
    return ctx.from.id
  }
}

// In private chats /qs just points at @fStikBot (no group pack to save into).
fstikFeature.hears(/^\/qs\b/i, async (ctx, next) => {
  if (ctx.chat?.type !== 'private') return next()
  await replyHtml(ctx, ctx.t('sticker-fstik'))
})

// /qs [emoji] — save the replied image/sticker into the group's pack.
fstikFeature.hears(/^\/qs(?:@\S+)?(?:\s+(.+))?/i, onlyGroup, onlyAdmin, async (ctx) => {
  if (!ctx.group) return
  const reply = ctx.message?.reply_to_message
  if (!reply) return replyHtml(ctx, ctx.t('sticker-empty_forward'))

  const source = pickStickerSource(reply)
  if (!source) return replyHtml(ctx, ctx.t('sticker-empty_forward'))
  if (source.animated) return replyHtml(ctx, ctx.t('sticker-save-error-animated'))

  let webp: Buffer
  try {
    webp = await toStickerWebp(await downloadTelegramFile(ctx.api, source.fileId))
  } catch (err) {
    if (err instanceof StickerTooLargeError) return replyHtml(ctx, ctx.t('sticker-save-error-too_large'))
    return replyHtml(ctx, ctx.t('sticker-save-error-telegram', { error: err instanceof Error ? err.message : String(err) }))
  }

  const emojiList = buildEmojiList(ctx.match?.[1]?.trim(), source.emoji)
  const owner = await resolvePackOwner(ctx)
  if (!owner) return

  const sticker: InputSticker = { sticker: new InputFile(webp, 'sticker.webp'), format: 'static', emoji_list: emojiList }
  let packName = ctx.group.stickerSet?.name ?? undefined

  try {
    if (packName) {
      await ctx.api.addStickerToSet(owner, packName.toLowerCase(), sticker)
    } else {
      const botUsername = ctx.me.username
      packName = `g${randomUUID().replace(/-/g, '').slice(0, 8)}_${Math.abs(ctx.group.group_id)}_by_${botUsername}`
      const title = `${(ctx.group.title ?? 'Group').slice(0, 40)} pack by @${botUsername}`
      await ctx.api.createNewStickerSet(owner, packName, title, [sticker])
      await setGroupStickerSet(ctx.group._id, packName)
    }
  } catch (err) {
    if (err instanceof GrammyError) {
      const d = err.description.toLowerCase()
      if (d.includes('peer_id_invalid') || d.includes('bot was blocked')) {
        return replyHtml(ctx, ctx.t('sticker-save-error-need_creator', { creator: 'The group creator' }))
      }
      // A stale/full pack: forget it so the next /qs starts a fresh one.
      if (d.includes('stickerset_invalid') || d.includes('too_much') || d.includes('too many')) {
        await setGroupStickerSet(ctx.group._id, null)
      }
    }
    return replyHtml(ctx, ctx.t('sticker-save-error-telegram', { error: err instanceof Error ? err.message : String(err) }))
  }

  return replyHtml(ctx, ctx.t('sticker-save-suc', { link: `${STICKER_LINK}${packName}` }))
})

// /qd — remove the replied sticker from the group pack, or from the quotes DB.
fstikFeature.command('qd', onlyGroup, onlyAdmin, async (ctx) => {
  if (!ctx.group) return
  const reply = ctx.message?.reply_to_message
  if (!reply?.sticker) return replyHtml(ctx, ctx.t('sticker-delete-empty_reply'))

  const packName = ctx.group.stickerSet?.name
  if (packName && reply.sticker.set_name === packName) {
    try {
      await ctx.api.deleteStickerFromSet(reply.sticker.file_id)
      return replyHtml(ctx, ctx.t('sticker-delete-suc', { link: `${STICKER_LINK}${packName}` }))
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      const reason = msg.includes('not found')
        ? ctx.t('sticker-delete-error-not_found')
        : msg.includes('rights') || msg.includes('administrator')
          ? ctx.t('sticker-delete-error-rights')
          : ctx.t('sticker-delete-error-generic', { error: msg })
      return replyHtml(ctx, ctx.t('sticker-delete-error-telegram', { reason }))
    }
  }

  // Not a pack sticker → treat as removing the quote from the group archive.
  const res = await Quote.deleteOne({ group: ctx.group._id, file_unique_id: reply.sticker.file_unique_id }).catch(() => null)
  if (!res || res.deletedCount !== 1) return replyHtml(ctx, ctx.t('sticker-delete_random-not_found'))
  return replyHtml(ctx, ctx.t('sticker-delete_random-suc'))
})

// /qdrand — remove the replied quote sticker from the group archive.
fstikFeature.command('qdrand', onlyGroup, onlyAdmin, async (ctx) => {
  if (!ctx.group) return
  const reply = ctx.message?.reply_to_message
  if (!reply?.sticker) return replyHtml(ctx, ctx.t('sticker-delete-empty_reply'))

  const res = await Quote.deleteOne({ group: ctx.group._id, file_unique_id: reply.sticker.file_unique_id }).catch(() => null)
  if (!res || res.deletedCount !== 1) return replyHtml(ctx, ctx.t('sticker-delete_random-not_found'))
  return replyHtml(ctx, ctx.t('sticker-delete_random-suc'))
})

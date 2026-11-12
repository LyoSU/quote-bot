import type { InlineKeyboard } from 'grammy'
import type { BotContext } from '../core/types'
import { LruCache } from '../core/lru'

type Panel = { parse_mode?: 'HTML'; link_preview_options?: { is_disabled: true }; reply_markup?: InlineKeyboard }

/**
 * Groups where an unprompted ephemeral send was refused (the bot isn't an admin
 * there) — skip the doomed attempt for a while instead of paying a failed call
 * on every command. Ephemeral commands don't need this: they open a reply window.
 */
const noEphemeral = new LruCache<number, true>(10_000, 10 * 60_000)

/**
 * Sends a message in a group only to the user who asked for it (Bot API 10.2+
 * ephemeral message), so admin panels and confirmations don't clutter the chat
 * and nobody else can tap them. An ephemeral command is answered in its
 * 15-second reply window; a plain one needs the bot to be a chat admin.
 * Returns false when the message could not go out ephemerally.
 */
export async function replyEphemeral(ctx: BotContext, text: string, other: Panel): Promise<boolean> {
  const msg = ctx.message
  if (!ctx.from || !msg || (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup')) return false
  const ephemeralId = msg.ephemeral_message_id
  if (!ephemeralId && noEphemeral.get(msg.chat.id)) return false
  return ctx
    .reply(text, {
      ...other,
      ephemeral_message_parameters: { receiver_user_id: ctx.from.id },
      ...(ephemeralId ? { reply_parameters: { ephemeral_message_id: ephemeralId } } : {}),
    })
    .then(
      () => true,
      () => {
        if (!ephemeralId) noEphemeral.set(msg.chat.id, true)
        return false
      },
    )
}

/**
 * Replies to the caller only where possible (see replyEphemeral), else as a
 * regular reply. Commands declared `is_ephemeral` must answer through this:
 * a public reply would expose what the user typed invisibly.
 */
export async function replyPrivately(ctx: BotContext, text: string, other: Panel): Promise<void> {
  if (await replyEphemeral(ctx, text, other)) return
  const messageId = ctx.message?.message_id
  await ctx
    .reply(text, {
      ...other,
      ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}),
    })
    .catch(() => {})
}

/** Edits the callback's message in place — ephemeral messages have their own edit method. */
export async function editPanelText(ctx: BotContext, text: string, other: Panel): Promise<void> {
  const msg = ctx.callbackQuery?.message
  const ephemeralId = msg && 'ephemeral_message_id' in msg ? msg.ephemeral_message_id : undefined
  const edit =
    ephemeralId && msg && ctx.from
      ? ctx.api.editEphemeralMessageText(msg.chat.id, ctx.from.id, ephemeralId, text, other)
      : ctx.editMessageText(text, other)
  await edit.catch(() => {})
}

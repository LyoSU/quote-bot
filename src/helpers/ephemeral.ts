import type { InlineKeyboard } from 'grammy'
import type { BotContext } from '../core/types'

type Panel = { parse_mode?: 'HTML'; link_preview_options?: { is_disabled: true }; reply_markup?: InlineKeyboard }

/**
 * Sends a menu in a group only to the user who asked for it (Bot API 10.2+
 * ephemeral message), so admin panels don't clutter the chat and nobody else
 * can tap them. An ephemeral command is answered in its 15-second reply window;
 * a plain one needs the bot to be a chat admin. Returns false when the message
 * could not go out ephemerally — the caller then replies the regular way.
 */
export async function replyEphemeral(ctx: BotContext, text: string, other: Panel): Promise<boolean> {
  const msg = ctx.message
  if (!ctx.from || !msg || (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup')) return false
  return ctx
    .reply(text, {
      ...other,
      ephemeral_message_parameters: { receiver_user_id: ctx.from.id },
      ...(msg.ephemeral_message_id ? { reply_parameters: { ephemeral_message_id: msg.ephemeral_message_id } } : {}),
    })
    .then(
      () => true,
      () => false,
    )
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

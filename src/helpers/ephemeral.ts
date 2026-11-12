import type { InlineKeyboard } from 'grammy'
import type { EphemeralMessageParameters, InputRichMessage, ReplyParameters } from 'grammy/types'
import type { BotContext } from '../core/types'

type Panel = { parse_mode?: 'HTML'; link_preview_options?: { is_disabled: true }; reply_markup?: InlineKeyboard }
type Extra = { ephemeral_message_parameters?: EphemeralMessageParameters; reply_parameters?: ReplyParameters }

/**
 * Answers an ephemeral command (Bot API 10.2+) so that only its sender sees the
 * reply — admin panels and confirmations don't clutter the chat and nobody else
 * can tap them. Only an incoming ephemeral command is answered this way: it
 * proves the sender's app can display such messages, and it opens a 15-second
 * reply window that needs no admin rights. A command typed the plain way (an
 * older app) gets a regular reply — an unprompted ephemeral message to it could
 * simply never be shown. Returns false when nothing was sent ephemerally.
 */
async function sendEphemeral(ctx: BotContext, send: (extra: Extra) => Promise<unknown>): Promise<boolean> {
  const ephemeralId = ctx.message?.ephemeral_message_id
  if (!ctx.from || !ephemeralId) return false
  return send({
    ephemeral_message_parameters: { receiver_user_id: ctx.from.id },
    reply_parameters: { ephemeral_message_id: ephemeralId },
  }).then(
    () => true,
    () => false, // window missed (backlog) or the server predates 10.2 — the caller replies publicly
  )
}

/** A regular reply to the command (an ephemeral command has no message_id to reply to). */
function replyTo(ctx: BotContext): Extra {
  const messageId = ctx.message?.message_id
  return messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}
}

export function replyEphemeral(ctx: BotContext, text: string, other: Panel): Promise<boolean> {
  return sendEphemeral(ctx, (extra) => ctx.reply(text, { ...other, ...extra }))
}

/**
 * Replies to the caller only where possible (see sendEphemeral), else as a
 * regular reply. Commands declared `is_ephemeral` must answer through this:
 * a public reply would expose what the user typed invisibly.
 */
export async function replyPrivately(ctx: BotContext, text: string, other: Panel): Promise<void> {
  if (await replyEphemeral(ctx, text, other)) return
  await ctx.reply(text, { ...other, ...replyTo(ctx) }).catch(() => {})
}

/**
 * A rich message (Bot API 10.1+, buttons 10.3+) as the ephemeral answer to an
 * ephemeral command. Never sent otherwise: an app old enough to send the
 * command the plain way may show a rich message as "unsupported". Returns
 * false when it wasn't sent, so the caller falls back to a classic message.
 */
export function replyRichEphemeral(ctx: BotContext, rich: InputRichMessage): Promise<boolean> {
  return sendEphemeral(ctx, (extra) => ctx.replyWithRichMessage(rich, extra))
}

/** Edits the callback's message in place — ephemeral messages have their own edit method. */
export async function editPanelText(ctx: BotContext, content: string | InputRichMessage, other: Panel = {}): Promise<void> {
  const msg = ctx.callbackQuery?.message
  const ephemeralId = msg && 'ephemeral_message_id' in msg ? msg.ephemeral_message_id : undefined
  const edit =
    ephemeralId && msg && ctx.from
      ? ctx.api.editEphemeralMessageText(msg.chat.id, ctx.from.id, ephemeralId, content, other)
      : ctx.editMessageText(content, other)
  await edit.catch(() => {})
}

/** True when the pressed button lives in a rich message (it must be edited as one). */
export function fromRichMessage(ctx: BotContext): boolean {
  const msg = ctx.callbackQuery?.message
  return Boolean(msg && 'rich_message' in msg && msg.rich_message)
}

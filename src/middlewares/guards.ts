import type { NextFunction } from 'grammy'
import type { BotContext } from '../core/types'

const ADMIN_STATUSES = new Set(['creator', 'administrator'])

function isGroupChat(ctx: BotContext): boolean {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'
}

async function denyHtml(ctx: BotContext, key: string): Promise<void> {
  const messageId = ctx.message?.message_id
  await ctx
    .reply(ctx.t(key), {
      parse_mode: 'HTML',
      ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}),
    })
    .catch(() => {})
}

/** Passes only in group/supergroup chats; otherwise replies with `only_group`. */
export async function onlyGroup(ctx: BotContext, next: NextFunction): Promise<void> {
  if (isGroupChat(ctx)) return next()
  await denyHtml(ctx, 'only_group')
}

/**
 * In groups, passes only for creators/administrators; in private chats everyone
 * is "admin" of their own settings, so it passes through.
 */
export async function onlyAdmin(ctx: BotContext, next: NextFunction): Promise<void> {
  if (!isGroupChat(ctx)) return next()
  if (!ctx.from) return

  const member = await ctx.getChatMember(ctx.from.id).catch(() => null)
  if (member && ADMIN_STATUSES.has(member.status)) return next()
  await denyHtml(ctx, 'only_admin')
}

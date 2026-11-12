import type { NextFunction } from 'grammy'
import type { BotContext } from '../core/types'
import { replyPrivately } from '../helpers/ephemeral'

const ADMIN_STATUSES = new Set(['creator', 'administrator'])

function isGroupChat(ctx: BotContext): boolean {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'
}

/** Refusals go to the caller alone — nobody else needs to read them. */
function denyHtml(ctx: BotContext, key: string): Promise<void> {
  return replyPrivately(ctx, ctx.t(key), { parse_mode: 'HTML' })
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

  // Known limitation: an admin posting anonymously (as the group/channel) shows
  // up as GroupAnonymousBot, whose getChatMember is not "administrator", so they
  // are denied. Accepted deliberately — anonymous posts carry no real user to
  // authorize, and treating any anonymous sender as admin would be spoofable.
  const member = await ctx.getChatMember(ctx.from.id).catch(() => null)
  if (member && ADMIN_STATUSES.has(member.status)) return next()
  await denyHtml(ctx, 'only_admin')
}

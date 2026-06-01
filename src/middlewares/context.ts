import type { NextFunction } from 'grammy'
import type { BotContext } from '../core/types'
import { getOrCreateUser } from '../db/repositories/user-repository'
import { getOrCreateGroup } from '../db/repositories/group-repository'
import { trackMember } from '../db/member-tracker'
import { statsService } from '../services/stats/stats-service'

/**
 * Resolves the domain identities for an update and attaches them to the
 * context, so features work with `ctx.user` / `ctx.group` instead of doing
 * their own lookups. Runs only on relevant updates (the fast-path already
 * dropped noise), so the DB work here is bounded to ~50/s.
 *
 * Also measures handler latency for the long-term Stats series.
 */
export async function contextMiddleware(ctx: BotContext, next: NextFunction): Promise<void> {
  const isPrivate = ctx.chat?.type === 'private'

  if (ctx.from && !ctx.from.is_bot) {
    ctx.user = await getOrCreateUser(ctx.from, isPrivate)
  }

  const chat = ctx.chat
  if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
    ctx.group = await getOrCreateGroup(chat)
    if (ctx.from) trackMember(ctx.group._id, ctx.from.id)
  }

  const start = Date.now()
  try {
    await next()
  } finally {
    statsService.record(Date.now() - start)
  }
}

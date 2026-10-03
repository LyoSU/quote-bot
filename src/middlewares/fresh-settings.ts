import type { NextFunction } from 'grammy'
import type { BotContext } from '../core/types'
import { logger } from '../core/logger'
import { User } from '../db/models/user'
import { Group } from '../db/models/group'

const log = logger.child({ module: 'fresh-settings' })

/**
 * Re-reads `settings` for the update's user and group straight from Mongo.
 *
 * The repositories cache User/Group docs for up to a minute and keep them
 * fresh by deleting on their own writes — but the Mini App writes the same
 * docs directly, so after a change there the cached copy is stale. Call this
 * before anything that reads or toggles settings (rendering a quote, the
 * settings menu): a change made in the app then applies to the very next
 * quote. Two indexed `_id` lookups, run only on those paths, not on every
 * update.
 *
 * The fresh value is written into the cached doc in place, so later updates
 * see it too. On a DB error the cached copy is kept — a stale look beats a
 * failed quote.
 */
export async function refreshSettings(ctx: BotContext): Promise<void> {
  const { user, group } = ctx
  try {
    const [u, g] = await Promise.all([
      user ? User.findById(user._id).select({ settings: 1 }).lean<{ settings?: typeof user.settings }>() : null,
      group ? Group.findById(group._id).select({ settings: 1 }).lean<{ settings?: typeof group.settings }>() : null,
    ])
    if (user && u?.settings) user.settings = u.settings
    if (group && g?.settings) group.settings = g.settings
  } catch (err) {
    log.warn({ err }, 'settings refresh failed, using cached copy')
  }
}

/** Route-level form of {@link refreshSettings} for handlers that read settings. */
export async function freshSettings(ctx: BotContext, next: NextFunction): Promise<void> {
  await refreshSettings(ctx)
  await next()
}

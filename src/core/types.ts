import type { Context } from 'grammy'
import type { I18nFlavor } from '@grammyjs/i18n'
import type { Logger } from 'pino'
import type { UserDoc, GroupDoc } from '../db/models'

/**
 * Properties we attach to grammY's Context.
 *
 * Later sub-projects add their own flavors (i18n translate fn, …) by
 * intersecting with this type — grammY's context flavor pattern.
 */
export interface AppContextExtension {
  /** Per-update child logger, pre-tagged with updateId/chatId. */
  logger: Logger
  /** Resolved sender row, set by the context middleware (when ctx.from exists). */
  user?: UserDoc
  /** Resolved group row, set for group/supergroup chats only. */
  group?: GroupDoc
  /** Set by the fast-path when a lively group moment should trigger an auto-quote. */
  gabTrigger?: boolean
}

export type BotContext = Context & I18nFlavor & AppContextExtension

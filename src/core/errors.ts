import { type Bot, GrammyError, HttpError } from 'grammy'
import type { BotContext } from './types'
import { logger as rootLogger } from './logger'

/**
 * Telegram error descriptions that are entirely outside our control and happen
 * constantly in normal operation (user blocked the bot, deleted the chat, …).
 * These are logged at debug to keep the error stream meaningful.
 */
const BENIGN_DESCRIPTIONS = [
  'bot was blocked by the user',
  'user is deactivated',
  'chat not found',
  'bot was kicked',
  'not enough rights',
  'message to be replied not found',
  'message to edit not found',
  'message is not modified',
  'query is too old',
  'MESSAGE_ID_INVALID',
]

function isBenign(err: GrammyError): boolean {
  if (err.error_code === 403) return true
  return BENIGN_DESCRIPTIONS.some((d) => err.description.includes(d))
}

/**
 * Global error boundary. Every error thrown anywhere in the middleware chain
 * lands here, gets classified, and is logged at an appropriate level. We never
 * let a single bad update take down the process.
 */
export function registerErrorBoundary(bot: Bot<BotContext>): void {
  bot.catch((err) => {
    const log = err.ctx?.logger ?? rootLogger
    const error = err.error

    if (error instanceof GrammyError) {
      const meta = { code: error.error_code, description: error.description, method: error.method }
      if (isBenign(error)) {
        log.debug(meta, 'Benign Telegram API error')
      } else {
        log.warn(meta, 'Telegram API error')
      }
      return
    }

    if (error instanceof HttpError) {
      // Network trouble reaching Telegram. auto-retry already had its chance.
      log.warn({ err: error.message }, 'Network error talking to Telegram')
      return
    }

    // Anything else is a real bug in our code — full detail, please.
    log.error({ err: error }, 'Unhandled error while processing update')
  })
}

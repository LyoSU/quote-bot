import { run, type RunnerHandle } from '@grammyjs/runner'
import type { Bot } from 'grammy'
import type { Update } from 'grammy/types'
import type { BotContext } from './types'
import { config } from '../config/env'

/**
 * Update types we ask Telegram for. `chat_member` and the business/payment
 * updates are NOT delivered by default — they must be opted into explicitly.
 */
const ALLOWED_UPDATES: ReadonlyArray<Exclude<keyof Update, 'update_id'>> = [
  'message',
  'edited_message',
  'guest_message',
  'callback_query',
  'inline_query',
  'chosen_inline_result',
  'my_chat_member',
  'chat_member',
  'chat_join_request',
  'pre_checkout_query',
  'shipping_query',
  'business_connection',
  'business_message',
  'edited_business_message',
  'deleted_business_messages',
]

/**
 * Starts long polling with concurrent processing. Per-chat ordering is enforced
 * by the `sequentialize` middleware (see core/bot); the sink bounds how many
 * updates run in parallel across all chats.
 */
export function startRunner(bot: Bot<BotContext>): RunnerHandle {
  return run(bot, {
    runner: {
      // Shorten the long-poll window from grammY's 30s default to 10s. The bot
      // is rarely idle, so getUpdates almost always returns immediately with a
      // batch — the wait only applies during genuine lulls. A shorter window
      // lets the client timeout (20s, see core/bot) sit just above it, so a
      // silently half-open connection is detected in ~20s instead of minutes,
      // without ever falsely killing an empty poll.
      fetch: { allowed_updates: ALLOWED_UPDATES, timeout: 10 },
      // networkRetry already logs each failed getUpdates cycle through pino;
      // the runner's own console.error would duplicate it past the logger.
      silent: true,
      // Constant pause between retry cycles. The default exponential backoff
      // grows unbounded, delaying recovery after a long Bot API outage.
      retryInterval: 5_000,
    },
    sink: {
      concurrency: config.BOT_CONCURRENCY,
    },
  })
}

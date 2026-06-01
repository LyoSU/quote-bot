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
      fetch: { allowed_updates: ALLOWED_UPDATES },
    },
    sink: {
      concurrency: config.BOT_CONCURRENCY,
    },
  })
}

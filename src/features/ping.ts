import { Composer } from 'grammy'
import type { BotContext } from '../core/types'

/**
 * /ping — liveness check. Also the canary that proves the whole foundation
 * (polling → fast-path → sequentialize → handler → outgoing throttle) is wired
 * correctly end to end.
 */
export const ping = new Composer<BotContext>()

ping.command('ping', async (ctx) => {
  const sent = await ctx.reply('🏓 pong')
  const rtt = Date.now() - sent.date * 1000
  await ctx.api.editMessageText(sent.chat.id, sent.message_id, `🏓 pong · ${rtt}ms`)
})

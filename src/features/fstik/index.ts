import { Composer } from 'grammy'
import type { BotContext } from '../../core/types'

export const fstikFeature = new Composer<BotContext>()

// /qs — points users at @fStikBot to save a sticker to their personal pack.
// (The legacy group-pack "save" flow is out of scope for the rewrite; the
// hint covers the common case without the bespoke pack machinery.)
fstikFeature.hears(/^\/qs\b/i, async (ctx) => {
  const messageId = ctx.message?.message_id
  await ctx
    .reply(ctx.t('sticker-fstik'), {
      parse_mode: 'HTML',
      ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}),
    })
    .catch(() => {})
})

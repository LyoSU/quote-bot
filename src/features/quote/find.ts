import { Composer, InlineKeyboard } from 'grammy'
import type { BotContext } from '../../core/types'
import { onlyGroup } from '../../middlewares/guards'

/** `/qfind` — one button opens inline search over this group's saved stickers. */
export function registerFind(composer: Composer<BotContext>): void {
  composer.command('qfind', onlyGroup, async (ctx) => {
    if (!ctx.group) return
    const keyboard = new InlineKeyboard().switchInlineCurrent(ctx.t('find-open'), `find:${ctx.group._id} `)
    const messageId = ctx.message?.message_id
    await ctx.reply(ctx.t('find-info'), {
      reply_markup: keyboard,
      ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}),
    })
  })
}

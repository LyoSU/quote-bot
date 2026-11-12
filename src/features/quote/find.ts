import { Composer, InlineKeyboard } from 'grammy'
import type { BotContext } from '../../core/types'
import { deepLink } from '../../helpers/deep-link'
import { onlyGroup } from '../../middlewares/guards'
import { replyPrivately } from '../../helpers/ephemeral'

/** `/qfind` — one button opens inline search over this group's saved stickers. */
export function registerFind(composer: Composer<BotContext>): void {
  composer.command('qfind', onlyGroup, async (ctx) => {
    if (!ctx.group) return
    const keyboard = new InlineKeyboard().switchInlineCurrent(ctx.t('find-open'), `find:${ctx.group._id} `)
    if (ctx.me?.username && (ctx.group.settings?.appButton ?? true)) {
      keyboard.row().url(ctx.t('app-open_archive'), deepLink.forGroup(ctx.me.username, ctx.group._id.toString()))
    }
    await replyPrivately(ctx, ctx.t('find-info'), { parse_mode: 'HTML', reply_markup: keyboard })
  })
}

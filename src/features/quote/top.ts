import { Composer, InlineKeyboard } from 'grammy'
import type { BotContext } from '../../core/types'
import { deepLink } from '../../helpers/deep-link'
import { onlyGroup } from '../../middlewares/guards'

/** `/qtop` — opens the group's top quotes via an inline switch + app link. */
export function registerTop(composer: Composer<BotContext>): void {
  composer.command('qtop', onlyGroup, async (ctx) => {
    if (!ctx.group) return
    const groupObjectId = ctx.group._id.toString()

    const kb = new InlineKeyboard().switchInlineCurrent(ctx.t('top-open'), `top:${groupObjectId}`)
    if (ctx.me?.username) kb.row().url(ctx.t('app-open_group'), deepLink.forGroup(ctx.me.username, groupObjectId))

    const messageId = ctx.message?.message_id
    await ctx.reply(ctx.t('top-info'), {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: kb,
      ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}),
    })
  })
}

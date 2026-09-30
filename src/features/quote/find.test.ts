import { Api, Composer, Context } from 'grammy'
import { Types } from 'mongoose'
import { describe, expect, it, vi } from 'vitest'
import type { BotContext } from '../../core/types'
import { registerFind } from './find'
import { i18n } from '../../i18n'

function context(chatType: 'supergroup' | 'private') {
  const ctx = new Context({
    update_id: 1,
    message: {
      message_id: 10, date: 1, text: '/qfind',
      entities: [{ type: 'bot_command', offset: 0, length: 6 }],
      chat: chatType === 'supergroup' ? { id: -100, type: 'supergroup', title: 'Group' } : { id: 7, type: 'private', first_name: 'Caller' },
      from: { id: 7, first_name: 'Caller', is_bot: false },
    },
  }, new Api('test:token'), {
    id: 99, username: 'testbot', first_name: 'Bot', is_bot: true,
  } as Context['me']) as BotContext
  const groupId = new Types.ObjectId()
  if (chatType === 'supergroup') ctx.group = { _id: groupId } as NonNullable<BotContext['group']>
  ctx.t = ((key: string) => i18n.t('en', key)) as BotContext['t']
  const reply = vi.fn<BotContext['reply']>(async () => ({} as never))
  ctx.reply = reply
  return { ctx, groupId, reply }
}

describe('/qfind', () => {
  it('sends exactly one button that opens group search in the current chat', async () => {
    const composer = new Composer<BotContext>()
    registerFind(composer)
    const { ctx, groupId, reply } = context('supergroup')
    await composer.middleware()(ctx, async () => {})
    expect(reply).toHaveBeenCalledExactlyOnceWith(i18n.t('en', 'find-info'), {
      parse_mode: 'HTML',
      reply_markup: expect.objectContaining({ inline_keyboard: [[{
        text: 'Search Quotes', switch_inline_query_current_chat: `find:${groupId} `,
      }]] }),
      reply_parameters: { message_id: 10, allow_sending_without_reply: true },
    })
  })

  it('uses the existing group-only guard in private chats', async () => {
    const composer = new Composer<BotContext>()
    registerFind(composer)
    const { ctx, reply } = context('private')
    await composer.middleware()(ctx, async () => {})
    expect(reply).toHaveBeenCalledExactlyOnceWith(i18n.t('en', 'only_group'), expect.any(Object))
    expect(reply.mock.calls[0]![1]).not.toHaveProperty('reply_markup')
  })

  it('is translated in every locale', () => {
    const en = i18n.t('en', 'find-open')
    for (const locale of i18n.locales.filter((l) => l !== 'en')) {
      expect(i18n.t(locale, 'find-open'), locale).not.toBe(en)
    }
  })
})

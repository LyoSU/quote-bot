import { Composer, InlineKeyboard } from 'grammy'
import type { BotContext } from '../../core/types'
import { i18n } from '../../i18n'
import { deepLink } from '../../helpers/deep-link'
import { updateUserSettings } from '../../db/repositories/user-repository'
import { updateGroupSettings } from '../../db/repositories/group-repository'

const ADMIN_STATUSES = new Set(['creator', 'administrator'])

function htmlReplyOptions(ctx: BotContext): {
  parse_mode: 'HTML'
  link_preview_options: { is_disabled: true }
  reply_parameters?: { message_id: number; allow_sending_without_reply: true }
} {
  const messageId = ctx.message?.message_id
  return {
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true as const } } : {}),
  }
}

// ---- Main menu ----

function mainMenuKeyboard(ctx: BotContext): InlineKeyboard {
  const username = ctx.me.username
  return new InlineKeyboard()
    .url(ctx.t('app-open_root'), deepLink.forRoot(username))
    .row()
    .text(ctx.t('menu-btn-features'), 'menu:features')
    .text(ctx.t('menu-btn-settings'), 'qs:open')
    .row()
    .text(ctx.t('menu-btn-help'), 'menu:help')
    .text(ctx.t('menu-btn-language'), 'menu:language')
    .row()
    .url(ctx.t('menu-btn-add_group'), `https://t.me/${username}?startgroup=add`)
}

async function showMainMenu(ctx: BotContext, edit: boolean): Promise<void> {
  const keyboard = mainMenuKeyboard(ctx)
  if (edit && ctx.callbackQuery) {
    await ctx
      .editMessageText(ctx.t('menu-title'), {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: keyboard,
      })
      .catch(() => {})
    return
  }
  await ctx.reply(ctx.t('menu-title'), { ...htmlReplyOptions(ctx), reply_markup: keyboard })
}

// ---- Language picker ----

function languageKeyboard(backCallback?: string): InlineKeyboard {
  const kb = new InlineKeyboard()
  i18n.locales.forEach((code, idx) => {
    kb.text(i18n.t(code, 'language_name'), `set_language:${code}`)
    if (idx % 2 === 1) kb.row()
  })
  if (backCallback) kb.row().text(i18n.t('en', 'menu-btn-back'), backCallback)
  return kb
}

const LANG_PICKER_TEXT = '🌍 Choose language\n\nHelp with translation: https://crwd.in/QuotLyBot'

async function showLanguagePicker(ctx: BotContext, opts: { edit?: boolean; backCallback?: string } = {}): Promise<void> {
  const reply_markup = languageKeyboard(opts.backCallback)
  if (opts.edit && ctx.callbackQuery) {
    await ctx.editMessageText(LANG_PICKER_TEXT, { reply_markup }).catch(() => {})
    return
  }
  await ctx.reply(LANG_PICKER_TEXT, { reply_markup })
}

// ---- Help ----

function helpKeyboard(ctx: BotContext): InlineKeyboard {
  return new InlineKeyboard().url(ctx.t('btn-add_group'), `https://t.me/${ctx.me.username}?startgroup=add`)
}

async function showHelp(ctx: BotContext): Promise<void> {
  // In groups, show the same interactive feature tabs as the private menu —
  // a newbie who just discovered the bot gets the full cheat-sheet in place,
  // no "open me in private" detour.
  if (ctx.group) {
    await ctx.reply(ctx.t('menu-features-title'), {
      ...htmlReplyOptions(ctx),
      reply_markup: featuresKeyboard((k) => ctx.t(k)),
    })
    return
  }
  await ctx.reply(ctx.t('help'), { ...htmlReplyOptions(ctx), reply_markup: helpKeyboard(ctx) })
}

// ---- Feature pages (menu) ----

const FEATURE_PAGES = ['basics', 'colors', 'media', 'group'] as const
type FeaturePage = (typeof FEATURE_PAGES)[number]

/** The "what can I do?" tab overview — the four feature pages + back to the menu. */
export function featuresKeyboard(t: (key: string) => string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t('menu-features-btn-basics'), 'menu:f_basics')
    .text(t('menu-features-btn-colors'), 'menu:f_colors')
    .row()
    .text(t('menu-features-btn-media'), 'menu:f_media')
    .text(t('menu-features-btn-group'), 'menu:f_group')
    .row()
    .text(t('menu-btn-back'), 'menu:main')
}

async function editPanel(ctx: BotContext, key: string, keyboard: InlineKeyboard): Promise<void> {
  await ctx
    .editMessageText(ctx.t(key), {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: keyboard,
    })
    .catch(() => {})
}

export const shellFeature = new Composer<BotContext>()

// /start
shellFeature.command('start', async (ctx) => {
  const payload = ctx.match.trim()
  if (ctx.chat?.type === 'private') {
    if (payload === 'help') return showHelp(ctx)
    return showMainMenu(ctx, false)
  }
  // Group /start (e.g. just after being added): show the feature tabs too.
  await showHelp(ctx)
})

// /help
shellFeature.command('help', showHelp)

// /app — deep-link into the mini app (group feed or personal root).
shellFeature.command('app', async (ctx) => {
  const username = ctx.me.username
  const inGroup = Boolean(ctx.group)
  const url = inGroup ? deepLink.forGroup(username, ctx.group?._id.toString()) : deepLink.forRoot(username)
  const label = inGroup ? ctx.t('app-open_group') : ctx.t('app-open_root')
  await ctx.reply(ctx.t('app-info'), {
    ...htmlReplyOptions(ctx),
    reply_markup: new InlineKeyboard().url(label, url),
  })
})

// /lang
shellFeature.command('lang', (ctx) => showLanguagePicker(ctx))

// set_language:<code>
shellFeature.callbackQuery(/^set_language:(.+)$/, async (ctx) => {
  const code = ctx.match?.[1]
  if (!code || !i18n.locales.includes(code)) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  const inGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'
  if (inGroup) {
    if (!ctx.from) return
    const member = await ctx.getChatMember(ctx.from.id).catch(() => null)
    if (!member || !ADMIN_STATUSES.has(member.status)) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }
    if (ctx.group) await updateGroupSettings(ctx.group._id, { 'settings.locale': code })
  } else if (ctx.user) {
    await updateUserSettings(ctx.user._id, { 'settings.locale': code })
  }

  ctx.i18n.useLocale(code)
  await ctx.answerCallbackQuery(i18n.t(code, 'language_name')).catch(() => {})
  await showMainMenu(ctx, true)
})

// menu:<action>
shellFeature.callbackQuery(/^menu:(.+)$/, async (ctx) => {
  const action = ctx.match?.[1] ?? ''
  const back = (target: string): InlineKeyboard => new InlineKeyboard().text(ctx.t('menu-btn-back'), target)

  switch (action) {
    case 'main':
      await showMainMenu(ctx, true)
      break
    case 'features':
      await editPanel(ctx, 'menu-features-title', featuresKeyboard((k) => ctx.t(k)))
      break
    case 'help':
      await editPanel(ctx, 'help', back('menu:main'))
      break
    case 'language':
      await showLanguagePicker(ctx, { edit: true, backCallback: 'menu:main' })
      break
    default: {
      const page = action.replace(/^f_/, '')
      if (FEATURE_PAGES.includes(page as FeaturePage)) {
        await editPanel(ctx, `menu-features-${page}-title`, back('menu:features'))
      }
    }
  }

  await ctx.answerCallbackQuery().catch(() => {})
})

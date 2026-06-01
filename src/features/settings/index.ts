import { Composer } from 'grammy'
import type { BotContext } from '../../core/types'
import { onlyAdmin, onlyGroup } from '../../middlewares/guards'
import { updateUserSettings } from '../../db/repositories/user-repository'
import { updateGroupSettings } from '../../db/repositories/group-repository'
import { Quote } from '../../db/models'
import { buildBackgroundColor, DEFAULT_BACKGROUND, parseColor } from '../quote/color'

const EMOJI_BRANDS = new Set(['apple', 'google', 'twitter', 'joypixels', 'blob'])

/** Extracts emoji (or the literal word "random") from the user's input. */
function extractEmojis(input: string): string | null {
  const matches = input.match(/random|\p{Extended_Pictographic}/gu)
  return matches?.join('') ?? null
}

function replyHtml(ctx: BotContext, text: string): Promise<unknown> {
  const messageId = ctx.message?.message_id
  return ctx
    .reply(text, {
      parse_mode: 'HTML',
      ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}),
    })
    .catch(() => undefined)
}

/** Writes a `settings.quote.*` value to the group (preferred) or user doc. */
async function setQuoteSetting(ctx: BotContext, key: string, value: string): Promise<void> {
  const path = `settings.quote.${key}`
  if (ctx.group) await updateGroupSettings(ctx.group._id, { [path]: value })
  else if (ctx.user) await updateUserSettings(ctx.user._id, { [path]: value })
}

/**
 * Toggles a boolean `settings.<field>` on the group (preferred) or user, using
 * the schema default when the field is unset. Returns the new value, or null if
 * there's no target document.
 */
async function toggleSetting(ctx: BotContext, field: 'hidden' | 'privacy', dflt: boolean): Promise<boolean | null> {
  const path = `settings.${field}`
  if (ctx.group) {
    const next = !(ctx.group.settings?.[field] ?? dflt)
    await updateGroupSettings(ctx.group._id, { [path]: next })
    return next
  }
  if (ctx.user) {
    const next = !(ctx.user.settings?.[field] ?? dflt)
    await updateUserSettings(ctx.user._id, { [path]: next })
    return next
  }
  return null
}

export const settingsFeature = new Composer<BotContext>()

// /qcolor [color] — default quote background (group or personal).
settingsFeature.hears(/^\/qcolor(?:@\S+)?(?:\s+(.+))?$/i, onlyAdmin, async (ctx) => {
  const arg = ctx.match?.[1]?.trim()
  let color = DEFAULT_BACKGROUND
  if (arg) {
    const spec = parseColor(arg)
    if (spec) color = buildBackgroundColor(spec)
  }
  await setQuoteSetting(ctx, 'backgroundColor', color)
  await replyHtml(ctx, ctx.t('quote-set_background_color', { backgroundColor: color }))
})

// /qb <brand> — emoji rendering brand.
settingsFeature.command('qb', onlyAdmin, async (ctx) => {
  const requested = ctx.match.trim().toLowerCase().split(/\s+/)[0] ?? ''
  const emojiBrand = EMOJI_BRANDS.has(requested) ? requested : 'apple'
  await setQuoteSetting(ctx, 'emojiBrand', emojiBrand)
  await replyHtml(ctx, ctx.t('quote-set_emoji_brand', { emojiBrand }))
})

// /qemoji <emoji> — sticker emoji suffix.
settingsFeature.command('qemoji', onlyAdmin, async (ctx) => {
  const emoji = extractEmojis(ctx.match.substring(0, 15))
  if (!emoji) {
    await replyHtml(ctx, ctx.t('emoji-info'))
    return
  }
  await setQuoteSetting(ctx, 'emojiSuffix', emoji)
  await replyHtml(ctx, ctx.t('emoji-done'))
})

// /hidden — toggle sender search (forward attribution).
settingsFeature.hears(/^\/hidden\b/i, onlyAdmin, async (ctx) => {
  const next = await toggleSetting(ctx, 'hidden', true)
  if (next === null) return
  await replyHtml(ctx, ctx.t(next ? 'hidden-settings-enable' : 'hidden-settings-disable'))
})

// /privacy — toggle privacy mode.
settingsFeature.command('privacy', onlyAdmin, async (ctx) => {
  const next = await toggleSetting(ctx, 'privacy', false)
  if (next === null) return
  await replyHtml(ctx, ctx.t(next ? 'privacy-settings-enable' : 'privacy-settings-disable'))
})

// /qrate — toggle group rating buttons (group only).
settingsFeature.hears(/^\/qrate\b/i, onlyGroup, onlyAdmin, async (ctx) => {
  if (!ctx.group) return
  const next = !(ctx.group.settings?.rate ?? true)
  await updateGroupSettings(ctx.group._id, { 'settings.rate': next })
  await replyHtml(ctx, ctx.t(next ? 'rate-settings-enable' : 'rate-settings-disable'))
})

// /qgab <n> — random-quote frequency (group only).
settingsFeature.hears(/^\/qgab(?:@\S+)?\s+(\d+)/i, onlyGroup, onlyAdmin, async (ctx) => {
  const gab = parseInt(ctx.match?.[1] ?? '0', 10)
  if (ctx.group) await updateGroupSettings(ctx.group._id, { 'settings.randomQuoteGab': gab })
  await replyHtml(ctx, ctx.t('random-gab', { gab }))
})

// /qarchive [on|off] — toggle text archiving (group only).
settingsFeature.command('qarchive', onlyGroup, onlyAdmin, async (ctx) => {
  if (!ctx.group) return
  const arg = ctx.match.trim().toLowerCase()
  const current = ctx.group.settings?.archive?.storeText ?? true

  if (arg === 'on' || arg === 'off') {
    const next = arg === 'on'
    await updateGroupSettings(ctx.group._id, { 'settings.archive.storeText': next })
    await replyHtml(ctx, ctx.t(next ? 'qarchive-on' : 'qarchive-off'))
    return
  }
  if (!arg) {
    await replyHtml(ctx, ctx.t(current ? 'qarchive-status_on' : 'qarchive-status_off'))
    return
  }
  await replyHtml(ctx, ctx.t('qarchive-usage'))
})

// /qforget <#n> — strip a quote's archived text/authors (author-only).
settingsFeature.command('qforget', onlyGroup, async (ctx) => {
  if (!ctx.group) return
  const match = ctx.match.match(/#?(\d+)/)
  if (!match) {
    await replyHtml(ctx, ctx.t('qforget-usage'))
    return
  }
  const local = parseInt(match[1]!, 10)

  const quote = await Quote.findOne({ group: ctx.group._id, local_id: local })
    .select('payload authors forgottenAt')
    .lean<{ payload?: unknown; forgottenAt?: Date; authors?: { telegram_id?: number }[]; _id: import('mongoose').Types.ObjectId }>()

  if (!quote) {
    await replyHtml(ctx, ctx.t('qforget-not_found', { local }))
    return
  }
  if (quote.forgottenAt) {
    await replyHtml(ctx, ctx.t('qforget-already_forgotten', { local }))
    return
  }
  if (!quote.payload) {
    await replyHtml(ctx, ctx.t('qforget-not_yet_archived', { local }))
    return
  }

  const requesterId = ctx.from?.id
  const isAuthor = quote.authors?.some((a) => a.telegram_id === requesterId)
  if (!isAuthor) {
    await replyHtml(ctx, ctx.t('qforget-not_author'))
    return
  }

  await Quote.updateOne(
    { _id: quote._id },
    {
      $unset: { payload: 1, authors: 1, source: 1 },
      $set: { hasVoice: false, hasMedia: false, forgottenAt: new Date() },
    },
  )
  await replyHtml(ctx, ctx.t('qforget-forgotten', { local }))
})

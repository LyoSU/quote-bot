import { Composer, InlineKeyboard } from 'grammy'
import { Types } from 'mongoose'
import type { BotContext } from '../../core/types'
import { User } from '../../db/models'
import { incrementQuoteCounter } from '../../db/repositories/group-repository'
import { tdlib } from '../../services/tdlib'
import { sendGramadsAd, shouldShowAds } from '../../services/gramads'
import { generateQuote } from '../../services/quote-api/client'
import { deepLink } from '../../helpers/deep-link'
import { assembleQuoteMessages, type AssembleDeps, type RawMessage } from './assemble'
import { handleQuoteError, replyHtml } from './errors'
import { parseQuoteArgs } from './parse-args'
import { pmBatcher } from './pm-batch'
import { persistQuote, type QuotePayload } from './persist'
import {
  resolveBackgroundColor,
  resolveEmojiBrand,
  resolveRenderSpec,
  resolveStickerEmojis,
} from './render'
import { buildQuoteReplyMarkup } from './reply-markup'
import { selectSourceMessages } from './select'
import { sendQuote } from './send'
import type { Sender } from './sender'
import { registerGetQuote } from './get'
import { registerRate } from './rate'
import { registerRandom } from './random'
import { registerTop } from './top'

/** First setting that's actually set wins (group overrides user). */
function pickSetting(...values: (string | null | undefined)[]): string | undefined {
  for (const v of values) if (v) return v
  return undefined
}

/** Resolves the `/q` argument string from a command, guest mention, or forward. */
function extractArgString(ctx: BotContext, rawText: string, isGuest: boolean): string {
  let text = rawText
  const username = ctx.me?.username
  if (username) text = text.replace(new RegExp(`@${username}\\b`, 'ig'), '').trim()

  if (/^\/q(\s|$)/i.test(text)) return text.replace(/^\/q\s*/i, '')
  // Guest mention form ("@bot rate") carries flags; a plain DM forward does not.
  return isGuest ? text : ''
}

/**
 * The `/q` pipeline. Orchestrates: parse → resolve render options → select
 * source messages → assemble → render → send → persist. Each step lives in its
 * own module; this function only wires them and owns the per-request caches.
 */
async function handleQuote(ctx: BotContext): Promise<void> {
  const isGuest = Boolean(ctx.guestMessage)
  const trigger = (ctx.guestMessage ?? ctx.message) as
    | (RawMessage & {
        external_reply?: RawMessage
        quote?: { text: string; entities?: import('grammy/types').MessageEntity[] }
        chat?: { id: number; type?: string }
      })
    | undefined
  if (!trigger || trigger.message_id === undefined) return

  const replyToId = trigger.message_id
  const rawText = trigger.text ?? trigger.caption ?? ''
  const flag = parseQuoteArgs(extractArgString(ctx, rawText, isGuest))

  // Guest mode has no chat history — it can only quote a replied message.
  if (isGuest && !trigger.reply_to_message) {
    await replyHtml(ctx, ctx.t('guest-need_reply', { username: ctx.me?.username ?? '' }))
    return
  }

  // In private chat, a forward or album part may be the first of a burst the
  // user wants merged into one quote — and a `/q` typed right after a forward
  // should re-quote that batch with its flags rather than spawn a second quote.
  // The batcher owns those cases; everything else renders inline immediately.
  if (!isGuest && ctx.chat?.type === 'private') {
    if (pmBatcher.handle(ctx, trigger, flag, (c, sources, f) => renderQuote(c, sources, f, { isGuest: false }))) {
      return
    }
  }

  const chatType = isGuest ? 'private' : (ctx.chat?.type ?? 'private')
  const isPrivate = chatType === 'private'
  const chatId = isGuest ? (trigger.chat?.id ?? 0) : (ctx.chat?.id ?? 0)

  // ---- Select source messages ----
  const { messages: sources } = await selectSourceMessages({
    trigger,
    chatId,
    isPrivate,
    isGuest,
    count: flag.count,
    fetcher: tdlib,
  })

  if (sources.length === 0) {
    await replyHtml(ctx, ctx.t('quote-empty_forward'), replyToId)
    return
  }

  await renderQuote(ctx, sources, flag, { isGuest, replyToId, trigger })
}

interface RenderOpts {
  isGuest: boolean
  /** Message id to thread the reply to (omitted for PM batches and guest mode). */
  replyToId?: number
  /** The original trigger message — used for guest preset + persist metadata. */
  trigger?: RawMessage & { chat?: { id: number; type?: string } }
}

/**
 * Renders an already-selected list of source messages into a quote and sends
 * it. Split out of {@link handleQuote} so the PM batcher can drive the same
 * pipeline with a debounced batch of forwarded/album messages.
 */
async function renderQuote(
  ctx: BotContext,
  sources: RawMessage[],
  flag: ReturnType<typeof parseQuoteArgs>,
  opts: RenderOpts,
): Promise<void> {
  const { isGuest, replyToId } = opts
  const trigger = opts.trigger
  const group = ctx.group
  const user = ctx.user
  const chatType = isGuest ? 'private' : (ctx.chat?.type ?? 'private')
  const isPrivate = chatType === 'private'
  const chatId = isGuest ? (trigger?.chat?.id ?? 0) : (ctx.chat?.id ?? 0)

  // ---- Resolve render options (group overrides user) ----
  const bgSetting = pickSetting(group?.settings?.quote?.backgroundColor, user?.settings?.quote?.backgroundColor)
  const emojiSuffix = pickSetting(group?.settings?.quote?.emojiSuffix, user?.settings?.quote?.emojiSuffix)
  const emojiBrandSetting = pickSetting(group?.settings?.quote?.emojiBrand, user?.settings?.quote?.emojiBrand)

  const spec = resolveRenderSpec(flag)
  const backgroundColor = resolveBackgroundColor(flag.color, bgSetting)
  const emojiBrand = resolveEmojiBrand(emojiBrandSetting)
  const emojis = resolveStickerEmojis(emojiSuffix)

  const hidden = flag.hidden || Boolean(group?.settings?.hidden) || Boolean(user?.settings?.hidden)
  const groupPrivacy = Boolean(group?.settings?.privacy) || isGuest

  // Ads: ru-locale, private chat only. Fired after collection so the ad message
  // can't be swept into the quote. Fully detached from the response.
  if (isPrivate && !isGuest && ctx.from) {
    const locale = user?.settings?.locale ?? ctx.from.language_code
    if (shouldShowAds(locale)) void sendGramadsAd(ctx.from.id)
  }

  // ---- Assemble into renderer messages ----
  const privacyCache = new Map<number, boolean>()
  const deps: AssembleDeps = {
    chatType,
    hidden,
    crop: flag.crop,
    showReply: flag.reply,
    unsupportedText: ctx.t('quote-unsupported_message'),
    groupPrivacy,
    enrichHidden: (name) => resolveHiddenSender(name),
    isUserPrivate: async (telegramId) => {
      const cached = privacyCache.get(telegramId)
      if (cached !== undefined) return cached
      const u = await User.findOne({ telegram_id: telegramId }).select('settings.privacy').lean<{
        settings?: { privacy?: boolean }
      }>()
      const isPriv = Boolean(u?.settings?.privacy)
      privacyCache.set(telegramId, isPriv)
      return isPriv
    },
  }

  const assembled = await assembleQuoteMessages(sources, deps)
  if (assembled.messages.length === 0) {
    await replyHtml(ctx, ctx.t('quote-empty_forward'), replyToId)
    return
  }

  // ---- Render + (in parallel) allocate the per-group local id ----
  const localIdPromise: Promise<number | null> = group
    ? incrementQuoteCounter(group._id).catch(() => null)
    : Promise.resolve(null)

  let image: Buffer
  let renderedType: string
  try {
    const result = await generateQuote({
      type: spec.type,
      format: spec.format,
      backgroundColor,
      width: spec.width,
      height: spec.height,
      scale: spec.scale,
      emojiBrand,
      messages: assembled.messages,
    })
    image = result.image
    renderedType = result.quoteType
  } catch (err) {
    await handleQuoteError(ctx, err, replyToId)
    return
  }

  const localId = await localIdPromise

  // ---- Build the reply markup ----
  const presetId = isGuest ? new Types.ObjectId() : undefined
  const rateEnabled = Boolean(group && ((group.settings?.rate ?? true) || flag.rate))

  let replyMarkup: { reply_markup?: InlineKeyboard }
  if (isGuest && presetId) {
    const kb = new InlineKeyboard()
      .text('👍 0', `irate:${presetId.toString()}:👍`)
      .text('👎 0', `irate:${presetId.toString()}:👎`)
    if (ctx.me?.username) kb.row().url('Quotly →', `https://t.me/${ctx.me.username}`)
    replyMarkup = { reply_markup: kb }
  } else {
    const deepLinkUrl =
      group && localId != null && ctx.me?.username
        ? deepLink.forQuote(ctx.me.username, group._id.toString(), localId)
        : null
    replyMarkup = buildQuoteReplyMarkup({
      rateEnabled,
      deepLinkUrl,
      openInAppLabel: deepLinkUrl ? ctx.t('app-open_quote') : null,
    })
  }

  // ---- Send ----
  let sendResult
  try {
    sendResult = await sendQuote({
      ctx,
      image,
      delivery: spec.delivery,
      emojis,
      replyToMessageId: isGuest ? undefined : replyToId,
      replyMarkup,
      presetId: presetId?.toString(),
      businessConnectionId: ctx.businessMessage?.business_connection_id,
    })
  } catch (err) {
    await handleQuoteError(ctx, err, replyToId)
    return
  }

  // ---- Persist (off the hot path) — only sticker quotes carry a file id ----
  if (sendResult.sent && sendResult.fileId && sendResult.fileUniqueId && renderedType === 'quote') {
    const payload: QuotePayload = {
      version: 1,
      messages: assembled.messages,
      backgroundColor,
      emojiBrand,
      scale: spec.scale,
      width: spec.width,
      height: spec.height,
      type: spec.type,
      format: spec.format,
    }
    const ctxMessage = {
      chat: { id: chatId },
      reply_to_message: trigger?.reply_to_message ? { date: trigger.reply_to_message.date } : undefined,
    }

    if (group) {
      const storeText = group.settings?.archive?.storeText ?? true
      void persistQuote({
        group,
        user,
        fileId: sendResult.fileId,
        fileUniqueId: sendResult.fileUniqueId,
        localId,
        payload,
        ctxMessage,
        privacy: assembled.privacy,
        rateEnabled,
        storeText,
      })
    } else if (isGuest && presetId) {
      void persistQuote({
        user,
        fileId: sendResult.fileId,
        fileUniqueId: sendResult.fileUniqueId,
        localId: null,
        presetId,
        payload,
        ctxMessage,
        privacy: assembled.privacy,
        rateEnabled: true,
        storeText: true,
        callerChat: ctx.guestMessage?.guest_bot_caller_chat,
      })
    }
  }
}

/** Looks up a hidden-forward sender by their display name (archive enrichment). */
async function resolveHiddenSender(name: string): Promise<Sender | null> {
  const u = await User.findOne({ full_name: name })
    .select('telegram_id first_name last_name username')
    .lean<{ telegram_id: number; first_name?: string; last_name?: string; username?: string }>()
  if (!u) return null
  return { id: u.telegram_id, first_name: u.first_name, last_name: u.last_name, username: u.username }
}

export const quoteFeature = new Composer<BotContext>()

// /q — the core command, plus business messages and DM single-shot.
quoteFeature.command('q', handleQuote)
quoteFeature.on('guest_message', handleQuote)
quoteFeature.on('business_message:text', async (ctx, next) => {
  if (ctx.businessMessage?.text?.startsWith('/q')) return handleQuote(ctx)
  return next()
})

registerGetQuote(quoteFeature)
registerRate(quoteFeature)
registerRandom(quoteFeature)
registerTop(quoteFeature)

// Any private-chat message (forward / paste) becomes a one-shot quote, but only
// after the command/get handlers above had their chance.
quoteFeature.on('message', async (ctx, next) => {
  if (ctx.chat?.type !== 'private') return next()
  if ((ctx.message.text ?? '').startsWith('/')) return next()
  return handleQuote(ctx)
})

export { handleQuote }

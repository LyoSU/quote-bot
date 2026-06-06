import { InputFile, InlineKeyboard, type Api } from 'grammy'
import type { BotContext } from '../../core/types'
import { packName, stickerService } from '../../services/sticker'
import type { QuoteDelivery } from './render'

export interface SendResult {
  sent: boolean
  fileId?: string
  fileUniqueId?: string
}

export interface SendQuoteParams {
  ctx: BotContext
  image: Buffer
  delivery: QuoteDelivery
  emojis: string[]
  replyToMessageId?: number
  replyMarkup: { reply_markup?: InlineKeyboard }
  /** Pre-minted Quote id (guest mode result id + rating callbacks). */
  presetId?: string
  /** Business connection id when the quote originates from a business message. */
  businessConnectionId?: string
}

function replyOptions(params: SendQuoteParams): {
  reply_parameters?: { message_id: number; allow_sending_without_reply: true }
  reply_markup?: InlineKeyboard
  business_connection_id?: string
} {
  return {
    ...(params.replyToMessageId
      ? { reply_parameters: { message_id: params.replyToMessageId, allow_sending_without_reply: true as const } }
      : {}),
    ...(params.businessConnectionId ? { business_connection_id: params.businessConnectionId } : {}),
    ...params.replyMarkup,
  }
}

/** Delivers a non-guest quote (sticker/photo/document) and returns its file ids. */
async function sendToChat(params: SendQuoteParams): Promise<SendResult> {
  const { ctx, image, delivery } = params
  const opts = replyOptions(params)

  if (delivery === 'photo') {
    await ctx.replyWithPhoto(new InputFile(image, 'quote.png'), opts)
    return { sent: true }
  }
  if (delivery === 'document') {
    await ctx.replyWithDocument(new InputFile(image, 'quote.png'), opts)
    return { sent: true }
  }

  const msg = await ctx.replyWithSticker(new InputFile(image, 'quote.webp'), opts)
  return { sent: true, fileId: msg.sticker?.file_id, fileUniqueId: msg.sticker?.file_unique_id }
}

/**
 * Guest delivery. `answerGuestQuery` needs an existing `sticker_file_id`, so we
 * stage the sticker into a per-caller pack to obtain one, then answer with a
 * cached-sticker result. The staged sticker is discarded as soon as the answer
 * is out (privacy — the pack is publicly viewable; the sent message keeps its
 * own reference to the file). Falls back to an "open in PM" article when
 * staging isn't possible (e.g. the caller never started the bot).
 */
async function sendToGuest(params: SendQuoteParams, api: Api): Promise<SendResult> {
  const { ctx, image, emojis, presetId } = params
  // The summoning user is the guest message's `from`; `guest_bot_caller_user`
  // only ever appears on messages the guest bot itself sent (the attribution
  // header), never on the incoming update.
  const caller = ctx.guestMessage?.from
  const botUsername = ctx.me.username

  // Whatever happens, the query must be answered — silence reads as a dead bot.
  const answerWithPmArticle = (): Promise<void> =>
    ctx
      .answerGuestQuery({
        type: 'article',
        id: 'pm',
        title: 'Quotly',
        input_message_content: { message_text: ctx.t('guest-open_in_pm') },
        ...(botUsername
          ? { reply_markup: new InlineKeyboard().url('Quotly →', `https://t.me/${botUsername}`) }
          : {}),
      })
      .then(() => {})
      .catch(() => {})

  if (!caller || !botUsername) {
    await answerWithPmArticle()
    return { sent: false }
  }

  const name = packName(`g${Math.abs(caller.id)}_by_`, botUsername).toLowerCase()
  const title = `Created by @${botUsername}`

  let staged
  try {
    staged = await stickerService.stageSticker(api, { ownerId: caller.id, name, title, webp: image, emojis })
  } catch (err) {
    ctx.logger.debug({ err }, 'guest sticker staging failed')
    await answerWithPmArticle()
    return { sent: false }
  }

  try {
    await ctx.answerGuestQuery({
      type: 'sticker',
      id: presetId ?? 'q',
      sticker_file_id: staged.file_id,
      ...params.replyMarkup,
    })
    return { sent: true, fileId: staged.file_id, fileUniqueId: staged.file_unique_id }
  } catch (err) {
    ctx.logger.debug({ err }, 'guest answer failed')
    await answerWithPmArticle()
    return { sent: false }
  } finally {
    // Answered or not, the quote must leave the pack immediately.
    stickerService.discardSticker(api, name, staged.file_id)
  }
}

/** Routes the rendered image to the right delivery channel. */
export function sendQuote(params: SendQuoteParams): Promise<SendResult> {
  if (params.ctx.guestMessage) return sendToGuest(params, params.ctx.api)
  return sendToChat(params)
}

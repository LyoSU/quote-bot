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
 * cached-sticker result. Falls back to an "open in PM" article when staging
 * isn't possible (e.g. the caller never started the bot).
 */
async function sendToGuest(params: SendQuoteParams, api: Api): Promise<SendResult> {
  const { ctx, image, emojis, presetId } = params
  const caller = ctx.guestMessage?.guest_bot_caller_user
  const botUsername = ctx.me.username
  if (!caller || !botUsername) return { sent: false }

  const name = packName(`g${Math.abs(caller.id)}_by_`, botUsername).toLowerCase()
  const title = `Created by @${botUsername}`

  try {
    await stickerService.addSticker(api, { ownerId: caller.id, name, title, webp: image, emojis })
    const set = await api.getStickerSet(name)
    const last = set.stickers[set.stickers.length - 1]
    if (!last) throw new Error('sticker set empty after add')

    await ctx.answerGuestQuery({
      type: 'sticker',
      id: presetId ?? 'q',
      sticker_file_id: last.file_id,
      ...params.replyMarkup,
    })
    stickerService.scheduleTrim(api, name)
    return { sent: true, fileId: last.file_id, fileUniqueId: last.file_unique_id }
  } catch (err) {
    ctx.logger.debug({ err }, 'guest sticker staging failed')
    await ctx
      .answerGuestQuery({
        type: 'article',
        id: 'pm',
        title: 'Quotly',
        input_message_content: { message_text: ctx.t('guest-open_in_pm') },
        ...(botUsername
          ? { reply_markup: new InlineKeyboard().url('Quotly →', `https://t.me/${botUsername}`) }
          : {}),
      })
      .catch(() => {})
    return { sent: false }
  }
}

/** Routes the rendered image to the right delivery channel. */
export function sendQuote(params: SendQuoteParams): Promise<SendResult> {
  if (params.ctx.guestMessage) return sendToGuest(params, params.ctx.api)
  return sendToChat(params)
}

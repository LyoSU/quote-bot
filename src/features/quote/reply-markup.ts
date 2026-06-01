import { InlineKeyboard } from 'grammy'

export interface QuoteReplyMarkupOptions {
  rateEnabled?: boolean
  deepLinkUrl?: string | null
  openInAppLabel?: string | null
}

/**
 * Builds the inline keyboard attached to a `/q` sticker. Pure: the caller
 * resolves the deep-link URL and label, keeping this free of ctx/i18n. Returns
 * `{}` when there are no buttons (passable as `...options` to a send call).
 */
export function buildQuoteReplyMarkup(
  opts: QuoteReplyMarkupOptions = {},
): { reply_markup?: InlineKeyboard } {
  const keyboard = new InlineKeyboard()
  let hasRows = false

  if (opts.rateEnabled) {
    keyboard.text('👍', 'rate:👍').text('👎', 'rate:👎')
    hasRows = true
  }

  if (opts.deepLinkUrl && opts.openInAppLabel) {
    if (hasRows) keyboard.row()
    keyboard.url(opts.openInAppLabel, opts.deepLinkUrl)
    hasRows = true
  }

  return hasRows ? { reply_markup: keyboard } : {}
}

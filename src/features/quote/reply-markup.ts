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
  let hasButtons = false

  // 👍 👎 and the app link share one row (the link sits alone when rating is off).
  if (opts.rateEnabled) {
    keyboard.text('👍', 'rate:👍').text('👎', 'rate:👎')
    hasButtons = true
  }

  if (opts.deepLinkUrl && opts.openInAppLabel) {
    keyboard.url(opts.openInAppLabel, opts.deepLinkUrl)
    hasButtons = true
  }

  return hasButtons ? { reply_markup: keyboard } : {}
}

/** A previously stored quote, as needed to rebuild its rating keyboard. */
export interface RatedQuote {
  rate?: { votes?: { vote?: unknown[] }[] | null } | null
}

/**
 * Builds the `👍 N / 👎 M` rating keyboard for a resent stored quote (`/q_<id>`,
 * `/qrand`, auto-gab), with the optional "open in app" button in the same row.
 */
export function buildRatingKeyboard(quote: RatedQuote, deepLinkRow?: { url: string; label: string }): InlineKeyboard {
  const up = quote.rate?.votes?.[0]?.vote?.length ?? 0
  const down = quote.rate?.votes?.[1]?.vote?.length ?? 0
  const keyboard = new InlineKeyboard().text(`👍 ${up || ''}`.trim(), 'rate:👍').text(`👎 ${down || ''}`.trim(), 'rate:👎')
  if (deepLinkRow) keyboard.url(deepLinkRow.label, deepLinkRow.url)
  return keyboard
}

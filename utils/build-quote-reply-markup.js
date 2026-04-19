const Markup = require('telegraf/markup')

// Pure builder for the inline keyboard attached to a /q sticker.
// Caller resolves deepLinkUrl and openInAppLabel — keeps this helper
// free of telegraf ctx / i18n dependencies for testability.
//
// Returns either { reply_markup: { inline_keyboard: [...] } } (passable
// directly to ctx.replyWithSticker as ...options) or {} (no markup).
module.exports = function buildQuoteReplyMarkup ({ rateEnabled, deepLinkUrl, openInAppLabel } = {}) {
  const rows = []

  if (rateEnabled) {
    rows.push([
      Markup.callbackButton('👍', 'rate:👍'),
      Markup.callbackButton('👎', 'rate:👎')
    ])
  }

  if (deepLinkUrl && openInAppLabel) {
    rows.push([
      Markup.urlButton(openInAppLabel, deepLinkUrl)
    ])
  }

  if (rows.length === 0) return {}
  return Markup.inlineKeyboard(rows).extra()
}

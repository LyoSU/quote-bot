module.exports = {
  handleHelp: require('./help'),
  handleAdv: require('./adv'),
  handleModerateAdv: require('./adv-moderate'),
  handleQuote: require('./quote'),
  handleGetQuote: require('./get'),
  handleTopQuote: require('./top'),
  handleRandomQuote: require('./random'),
  handleColorQuote: require('./color-settings'),
  handleEmojiBrandQuote: require('./emoji-brand'),
  handleSettingsHidden: require('./hidden-settings'),
  handleGabSettings: require('./gab-settings'),
  handleSave: require('./sticker-save'),
  handleDelete: require('./sticker-delete'),
  handleDeleteRandom: require('./sticker-random-delete'),
  handleRate: require('./rate'),
  handleEmoji: require('./emoji'),
  handleSettingsRate: require('./rate-settings'),
  handlePrivacy: require('./privacy-settings'),
  handleLanguage: require('./language'),
  handleFstik: require('./fstik'),
  handleSticker: require('./sticker'),
  handleDonate: require('./donate'),
  handlePing: require('./ping'),
  handleChatMember: require('./chat-member'),
  handleInlineQuery: require('./inline-query')
}

// Приклад оновлення одного з хендлерів
async function handleQuote(ctx, next) {
  // Замість ctx.replyWithHTML використовуємо ctx.reply
  await ctx.reply('Message', {
    parse_mode: 'HTML',
    reply_to_message_id: ctx.message.message_id
  })

  // Замість ctx.telegram використовуємо ctx.api
  await ctx.api.sendMessage(chatId, text, options)

  // Замість ctx.answerCbQuery використовуємо ctx.answerCallbackQuery
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery()
  }
}

// ...інші хендлери...

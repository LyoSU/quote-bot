// Derives read-optimized fields from the quoteMessages array that handlers/quote.js
// builds for POSTing to quote-api's /generate.webp. Called once at Quote.create time
// and never updated (quotes are immutable).

// Display-name fallback: handlers/quote.js:659 may assign .name = false to non-first-in-streak
// messages, so we read first_name / title in priority order.
function pickDisplayName (from) {
  if (!from) return null
  if (from.first_name) return [from.first_name, from.last_name].filter(Boolean).join(' ')
  if (from.title) return from.title
  if (typeof from.name === 'string') return from.name
  return null
}

module.exports = function denormalizeQuote (quoteMessages, ctxMessage, { privacy = false } = {}) {
  let hasVoice = false
  let hasMedia = false

  for (const m of quoteMessages) {
    if (m.voice) hasVoice = true
    if (m.media) hasMedia = true
  }

  const authors = []
  const source = {
    date: ctxMessage && ctxMessage.reply_to_message && ctxMessage.reply_to_message.date
      ? new Date(ctxMessage.reply_to_message.date * 1000)
      : new Date()
  }

  if (!privacy) {
    const seen = new Set()
    for (const m of quoteMessages) {
      const from = m.from
      const name = pickDisplayName(from)
      if (!name) continue

      const key = from && from.id != null ? `id:${from.id}` : `name:${name}`
      if (seen.has(key)) continue
      seen.add(key)

      authors.push({
        telegram_id: from ? from.id : undefined,
        first_name: from ? from.first_name : undefined,
        last_name: from ? from.last_name : undefined,
        username: from ? from.username : undefined,
        title: from ? from.title : undefined,
        name
      })
    }
    if (ctxMessage && ctxMessage.chat) source.chat_id = ctxMessage.chat.id
    source.message_ids = quoteMessages.map(m => m.message_id).filter(Boolean)
  }

  return {
    authors,
    hasVoice,
    hasMedia,
    messageCount: quoteMessages.length,
    source
  }
}

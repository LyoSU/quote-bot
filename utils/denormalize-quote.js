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
    // Reply-to-media (set by the reply block in handlers/quote.js) also counts
    // toward hasMedia for archive search/filter purposes — the quote visually
    // includes that media via the reply preview block.
    if (m.replyMessage && m.replyMessage.media) {
      if (m.replyMessage.media.kind === 'voice') hasVoice = true
      else hasMedia = true
    }
  }

  const authors = []
  // Prefer the actual first-message timestamp (handlers/quote.js saves it on
  // each message). Fallback to the reply-to-message date (only present for
  // group quotes) and finally to "now" for the degenerate DM case. Before
  // this, DM quotes always got now() and archive-published times were wrong.
  const firstDateUnix = quoteMessages.find(m => typeof m.date === 'number')?.date
  const replyDateUnix = ctxMessage && ctxMessage.reply_to_message && ctxMessage.reply_to_message.date
  const source = {
    date: firstDateUnix
      ? new Date(firstDateUnix * 1000)
      : replyDateUnix
        ? new Date(replyDateUnix * 1000)
        : new Date()
  }

  if (!privacy) {
    const seen = new Set()
    const addAuthor = (entry, key) => {
      if (seen.has(key)) return
      seen.add(key)
      authors.push(entry)
    }

    for (const m of quoteMessages) {
      const from = m.from
      const name = pickDisplayName(from)
      if (name) {
        const key = from && from.id != null ? `id:${from.id}` : `name:${name}`
        addAuthor({
          telegram_id: from ? from.id : undefined,
          first_name: from ? from.first_name : undefined,
          last_name: from ? from.last_name : undefined,
          username: from ? from.username : undefined,
          title: from ? from.title : undefined,
          name
        }, key)
      }

      // In groups, m.from is the forwarder (see handlers/quote.js forward
      // override). The words in the bubble belong to the ORIGINAL author,
      // stashed on m.forward. Credit both so archive search/"more from
      // author" lands on the real speaker, not just whoever forwarded.
      const fwd = m.forward
      if (fwd && fwd.name) {
        const fwdId = fwd.from && typeof fwd.from.id === 'number' ? fwd.from.id : undefined
        const fwdKey = fwdId != null ? `id:${fwdId}` : `name:${fwd.name}`
        addAuthor({
          telegram_id: fwdId,
          username: fwd.from ? fwd.from.username : undefined,
          title: fwd.from && fwd.from.kind === 'chat' ? fwd.name : undefined,
          name: fwd.name
        }, fwdKey)
      }
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

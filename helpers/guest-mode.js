// Guest Mode (Bot API 10.0, 2026-05-08) — a bot can answer messages in chats
// it is NOT a member of, exactly once per query. We adapt the existing handlers
// to this constraint by transforming ctx.replyWith* calls into a single
// `answerGuestQuery(guest_query_id, InlineQueryResult)` call.
//
// Spec quick-ref:
//   update.guest_message         — Message object with guest_query_id,
//                                  guest_bot_caller_user, guest_bot_caller_chat
//   answerGuestQuery(qid, result) → SentGuestMessage { inline_message_id }
//   result is an InlineQueryResult (same shape as answerInlineQuery items).
//
// Constraints baked into this module:
//   * One answer per query — the proxy enforces it and silently no-ops the rest.
//   * No follow-up edits (we only get inline_message_id back, and the chat is
//     foreign — editMessageText via inline_message_id IS possible, but we don't
//     expose it; handlers that try to edit will quietly no-op).
//   * No deleteMessage — bot is not a member, so silently swallow.
//   * sendChatAction — silently swallow (no chat we can target).

const Markup = require('telegraf/markup')

const GUEST_ANSWER_TIMEOUT_MS = 25000

const isGuest = (ctx) => !!(ctx && ctx.state && ctx.state.guest)

// Read the raw guest envelope off the update. Returns null in non-guest contexts.
const getGuestState = (ctx) => {
  if (!ctx) return null
  if (ctx.state && ctx.state.guest) return ctx.state.guest

  const gm = ctx.update && ctx.update.guest_message
  if (!gm) return null

  return {
    queryId: gm.guest_query_id,
    callerUser: gm.guest_bot_caller_user || gm.from || null,
    callerChat: gm.guest_bot_caller_chat || gm.chat || null,
    message: gm
  }
}

// Convert telegraf's "extra" sticker options into the answerGuestQuery
// result shape. We drop reply_to_message_id / allow_sending_without_reply /
// business_connection_id silently — guest replies don't reply-thread.
const stripUnsupportedExtra = (extra = {}) => {
  if (!extra || typeof extra !== 'object') return {}
  const {
    reply_to_message_id, // eslint-disable-line camelcase
    allow_sending_without_reply, // eslint-disable-line camelcase
    business_connection_id, // eslint-disable-line camelcase
    disable_web_page_preview, // eslint-disable-line camelcase
    emoji,
    ...rest
  } = extra
  return rest
}

// Build a stable short id for the result object. Telegram accepts up to 64
// chars; using the query id as a seed is convenient and unique per query.
const buildResultId = (ctx, suffix = 'r') => {
  const qid = (ctx.state && ctx.state.guest && ctx.state.guest.queryId) || 'x'
  return `g_${suffix}_${String(qid).slice(0, 48)}`
}

// Markup helpers — accept either a telegraf Markup instance, a raw object,
// or undefined, and return the unwrapped reply_markup for use inside an
// InlineQueryResult.
const normalizeReplyMarkup = (extra = {}) => {
  if (!extra) return undefined
  if (extra.reply_markup) {
    // Telegraf Markup wraps under .reply_markup once .inlineKeyboard() chain runs;
    // raw extras already use this same shape.
    return extra.reply_markup
  }
  if (extra.inline_keyboard) return extra
  return undefined
}

const answerGuestQuery = (ctx, result) => {
  const state = ctx.state && ctx.state.guest
  if (!state || !state.queryId) {
    throw new Error('answerGuestQuery: no guest state on ctx')
  }
  if (state.answered) {
    // Defensive: a handler tried to reply twice. The first reply wins,
    // subsequent ones would 400 from Telegram. Silently drop.
    return Promise.resolve({ inline_message_id: state.sentInlineMessageId || null })
  }
  state.answered = true

  return Promise.race([
    ctx.telegram.callApi('answerGuestQuery', {
      guest_query_id: state.queryId,
      result
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('answerGuestQuery timeout')), GUEST_ANSWER_TIMEOUT_MS)
    )
  ])
    .then((sent) => {
      if (sent && sent.inline_message_id) state.sentInlineMessageId = sent.inline_message_id
      return sent
    })
    .catch((err) => {
      // Don't reset `answered` — Telegram has already consumed the query id
      // after the first call attempt. Logging here is enough.
      console.warn('[guest] answerGuestQuery failed:', err && err.message)
      return null
    })
}

// One-shot text reply as an InlineQueryResultArticle.
const answerGuestArticle = (ctx, html, extra = {}) => {
  const result = {
    type: 'article',
    id: buildResultId(ctx, 'a'),
    title: extra.title || 'Quotly',
    description: extra.description,
    input_message_content: {
      message_text: html,
      parse_mode: extra.parse_mode || 'HTML',
      link_preview_options: {
        is_disabled: extra.disable_web_page_preview !== false
      }
    },
    reply_markup: normalizeReplyMarkup(extra)
  }
  return answerGuestQuery(ctx, result)
}

// One-shot sticker reply by file_id. Caller must have obtained file_id by
// uploading the webp through a chat the bot CAN write to (see uploadStickerForGuest).
const answerGuestSticker = (ctx, fileId, extra = {}) => {
  const result = {
    type: 'sticker',
    id: buildResultId(ctx, 's'),
    sticker_file_id: fileId,
    reply_markup: normalizeReplyMarkup(extra)
  }
  return answerGuestQuery(ctx, result)
}

const answerGuestPhoto = (ctx, fileId, extra = {}) => {
  const result = {
    type: 'photo',
    id: buildResultId(ctx, 'p'),
    photo_file_id: fileId,
    caption: extra.caption,
    parse_mode: extra.caption ? (extra.parse_mode || 'HTML') : undefined,
    reply_markup: normalizeReplyMarkup(extra)
  }
  return answerGuestQuery(ctx, result)
}

const answerGuestDocument = (ctx, fileId, extra = {}) => {
  const result = {
    type: 'document',
    id: buildResultId(ctx, 'd'),
    title: extra.title || 'quote',
    document_file_id: fileId,
    caption: extra.caption,
    parse_mode: extra.caption ? (extra.parse_mode || 'HTML') : undefined,
    reply_markup: normalizeReplyMarkup(extra)
  }
  return answerGuestQuery(ctx, result)
}

// Upload a freshly-generated webp buffer and return its file_id + file_unique_id.
//
// answerGuestQuery({type:'sticker', sticker_file_id}) requires a pre-existing
// file_id — we cannot upload bytes in one call. The cheapest way to mint a
// file_id is to push the webp into our own globalStickerSet, snapshot the
// resulting sticker, then let the periodic cleaner in handlers/quote.js
// prune old entries.
//
// Concurrency: multiple workers can push into the shared globalStickerSet
// in parallel. Taking `stickers[last]` blindly would race and hand caller A
// caller B's sticker. We instead snapshot the set's file_unique_id list
// BEFORE adding, then compute the set difference AFTER — Telegram derives
// file_unique_id from file content, and our webp bytes are unique per
// quote (message ids + dates + entities differ), so the new sticker has
// a unique id that didn't exist before our call.
const uploadStickerForGuest = async (ctx, buffer) => {
  const cfg = (ctx.config && ctx.config.globalStickerSet) || null
  if (!cfg) throw new Error('uploadStickerForGuest: no globalStickerSet in config')
  const me = ctx.botInfo || await ctx.telegram.getMe()
  const setName = (cfg.name || 'default') + me.username
  const ownerId = cfg.ownerId
  if (!ownerId) throw new Error('uploadStickerForGuest: missing globalStickerSet.ownerId')

  const setBefore = await ctx.telegram.getStickerSet(setName).catch(() => ({ stickers: [] }))
  const beforeIds = new Set((setBefore.stickers || []).map((s) => s.file_unique_id))

  await ctx.telegram.addStickerToSet(ownerId, setName.toLowerCase(), {
    png_sticker: { source: buffer },
    emojis: '💬'
  }, true)

  const setAfter = await ctx.telegram.getStickerSet(setName)
  const newCandidates = (setAfter.stickers || []).filter((s) => !beforeIds.has(s.file_unique_id))

  // If exactly one new entry — it's ours. If multiple, another worker also
  // raced an add concurrently; the newest one in the pack is more likely
  // ours but not guaranteed. Log so we can spot it in prod metrics.
  if (newCandidates.length > 1) {
    console.warn('[guest] uploadStickerForGuest: concurrent add detected, picking latest', { newCount: newCandidates.length })
  }
  const ours = newCandidates[newCandidates.length - 1] || setAfter.stickers[setAfter.stickers.length - 1]
  if (!ours) throw new Error('uploadStickerForGuest: sticker set is empty after add')
  return { fileId: ours.file_id, fileUniqueId: ours.file_unique_id }
}

// Wrap a ctx so that ctx.replyWithSticker / replyWithHTML / replyWithPhoto /
// replyWithDocument / replyWithChatAction / deleteMessage transparently route
// to answerGuestQuery (or no-op where impossible). Returns the same ctx for
// chaining.
//
// We mutate the instance (not the prototype) so the shim is per-update and
// concurrent updates in the same worker stay isolated.
const wrapGuestProxy = (ctx) => {
  if (!isGuest(ctx) || ctx.state.guest._proxied) return ctx
  ctx.state.guest._proxied = true

  // Capture original methods just in case a handler wants the escape hatch
  // (currently unused but cheap to keep).
  ctx.state.guest._original = {
    replyWithSticker: ctx.replyWithSticker,
    replyWithHTML: ctx.replyWithHTML,
    replyWithPhoto: ctx.replyWithPhoto,
    replyWithDocument: ctx.replyWithDocument,
    replyWithChatAction: ctx.replyWithChatAction,
    reply: ctx.reply,
    deleteMessage: ctx.deleteMessage
  }

  ctx.replyWithChatAction = () => Promise.resolve(null) // foreign chat — silent.
  ctx.deleteMessage = () => Promise.resolve(false)
  ctx.reply = (text, extra) => answerGuestArticle(ctx, text, extra || {})
  ctx.replyWithHTML = (html, extra) => answerGuestArticle(ctx, html, { ...(extra || {}), parse_mode: 'HTML' })
  ctx.replyWithMarkdown = (md, extra) => answerGuestArticle(ctx, md, { ...(extra || {}), parse_mode: 'Markdown' })

  // For sticker/photo/document we accept either a file_id string (works) or a
  // buffer/stream/source object — the latter needs uploadStickerForGuest first.
  ctx.replyWithSticker = async (sticker, extra) => {
    const cleanExtra = stripUnsupportedExtra(extra)
    if (typeof sticker === 'string') {
      const sent = await answerGuestSticker(ctx, sticker, cleanExtra)
      // Surface the file_id so the caller (quote.js) can persist a Quote doc
      // with the same identity it would have produced in a regular reply.
      // sticker may already be a file_id we don't have unique_id for.
      ctx.state.guest.lastStickerFileId = sticker
      return sent
    }
    // Buffer / { source } — upload first.
    let buf
    if (Buffer.isBuffer(sticker)) buf = sticker
    else if (sticker && sticker.source) buf = sticker.source
    if (!buf) {
      console.warn('[guest] replyWithSticker called with unsupported payload')
      return answerGuestArticle(ctx, '⚠️ Unable to send sticker via guest mode.')
    }
    try {
      const { fileId, fileUniqueId } = await uploadStickerForGuest(ctx, buf)
      ctx.state.guest.lastStickerFileId = fileId
      ctx.state.guest.lastStickerFileUniqueId = fileUniqueId
      return answerGuestSticker(ctx, fileId, cleanExtra)
    } catch (err) {
      console.warn('[guest] sticker upload failed:', err && err.message)
      // Fallback: degrade to text.
      return answerGuestArticle(ctx, '⚠️ Failed to deliver quote sticker. Try again or run /q in PM.')
    }
  }

  ctx.replyWithPhoto = async (photo, extra) => {
    const cleanExtra = stripUnsupportedExtra(extra)
    if (typeof photo === 'string') return answerGuestPhoto(ctx, photo, cleanExtra)
    // Without a file_id we can't return a photo via answerGuestQuery; degrade.
    return answerGuestArticle(ctx, cleanExtra.caption || '📷 (image)', cleanExtra)
  }

  ctx.replyWithDocument = async (doc, extra) => {
    const cleanExtra = stripUnsupportedExtra(extra)
    if (typeof doc === 'string') return answerGuestDocument(ctx, doc, cleanExtra)
    return answerGuestArticle(ctx, cleanExtra.caption || '📎 (file)', cleanExtra)
  }

  return ctx
}

module.exports = {
  isGuest,
  getGuestState,
  answerGuestQuery,
  answerGuestArticle,
  answerGuestSticker,
  answerGuestPhoto,
  answerGuestDocument,
  uploadStickerForGuest,
  wrapGuestProxy,
  Markup
}

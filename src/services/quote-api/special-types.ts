import type { MessageEntity } from 'grammy/types'

/**
 * Renderer payloads for Telegram message types that have no text/media of
 * their own: checklists, gifts, giveaways, stories, plus the forum topic the
 * message belongs to. Built by features/quote/special-types.ts, drawn by
 * quote-api utils/quote-generate/cards.js.
 *
 * Contract: whenever one of `checklist` / `gift` / `giveaway` / `story` is
 * present, `QuoteMessage.text/entities` hold a plain-text FALLBACK for older
 * renderers. A renderer that draws the card ignores them (a gift's own
 * message text travels in `gift.text`).
 *
 * Colors are '#rrggbb' strings (converted from Bot API RGB24 ints by the bot).
 * All labels are already localized and formatted by the bot.
 */

export interface QuoteChecklistTask {
  text: string
  entities?: MessageEntity[]
  done: boolean
}

export interface QuoteChecklist {
  title: string
  title_entities?: MessageEntity[]
  /** Every task (Telegram caps a checklist at 30); the renderer shows 8 + "+N". */
  tasks: QuoteChecklistTask[]
  othersCanMarkDone?: boolean
  /** Localized footer, e.g. "3 of 5 completed". */
  footer?: string
}

/** A gift sticker; animated/video ones render from `thumb` (no lottie in the renderer). */
export interface QuoteGiftSticker {
  file_id: string
  is_animated?: boolean
  is_video?: boolean
  thumb?: { file_id: string }
}

export interface QuoteGiftRegular {
  kind: 'regular'
  /** Localized "Gift" (or "Gift upgrade"). */
  title: string
  sticker?: QuoteGiftSticker
  starCount?: number
  /** The gift's own message (GiftInfo.text), drawn below the card as normal text. */
  text?: string
  entities?: MessageEntity[]
}

export interface QuoteGiftUnique {
  kind: 'unique'
  /** "base_name #number", ready to draw. */
  name: string
  /** Small attribute line, e.g. "Model · Backdrop · Symbol". */
  attributes?: string
  model: { name: string; sticker?: QuoteGiftSticker }
  symbol?: { name: string; sticker?: QuoteGiftSticker }
  backdrop: {
    name: string
    centerColor: string
    edgeColor: string
    symbolColor: string
    textColor: string
  }
  text?: string
  entities?: MessageEntity[]
}

export type QuoteGift = QuoteGiftRegular | QuoteGiftUnique

/** Giveaway / winners / completed card. Text-centric: the renderer just draws the lines. */
export interface QuoteGiveaway {
  kind: 'giveaway' | 'winners' | 'completed'
  /** Bold title ("Giveaway", "Giveaway winners", …). */
  title: string
  /** Prize line ("5× Telegram Premium · 3 months", "10,000 Stars", description). */
  prize?: string
  /** Muted micro lines (winner count, end date, channels…). */
  meta?: string[]
  /** First winner names (+N already folded into the last entry by the bot). */
  winners?: string
}

/** Forwarded story row. Bot API carries no story media — label only. */
export interface QuoteStory {
  label: string
  chatName?: string
}

/** Forum topic the message belongs to (header line above the name). */
export interface QuoteTopic {
  name: string
  iconColor?: string
  iconEmojiId?: string
}

/** The QuoteMessage fields this module adds (mixed into QuoteMessage). */
export interface QuoteSpecialFields {
  checklist?: QuoteChecklist
  gift?: QuoteGift
  giveaway?: QuoteGiveaway
  story?: QuoteStory
  topic?: QuoteTopic
}

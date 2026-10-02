import type { MessageEntity } from 'grammy/types'

/**
 * Normalized Rich Message payload (Bot API 10.1+ `Message.rich_message`) in
 * the shape the renderer (quote-api utils/quote-generate/rich.js) reads.
 *
 * A small closed set of block kinds: the bot flattens the nested Telegram
 * tree (lists of lists, quotes of blocks, collages…) into these, so the
 * renderer never has to understand the full Rich* type zoo. Media blocks are
 * NOT here — they go through the regular media/album fields of the message.
 *
 * Every text is plain text + Bot API entities (UTF-16 offsets), the same
 * format as `QuoteMessage.text/entities`.
 */
export interface QuoteRichText {
  text: string
  entities?: MessageEntity[]
}

export interface QuoteRichListItem extends QuoteRichText {
  /** Nesting level, 0-based (the renderer clamps deeper levels to 2). */
  depth: number
  /** Ordered-list label ("1.", "b.", "iv."); absent = bullet. */
  marker?: string
  /** Task list item: true = checked, false = unchecked, absent = no checkbox. */
  check?: boolean
}

export interface QuoteRichTableCell extends QuoteRichText {
  header?: boolean
  align?: 'left' | 'center' | 'right'
  /** colspan > 1. */
  span?: number
}

export type QuoteRichBlock =
  | ({ type: 'paragraph' } & QuoteRichText)
  | ({ type: 'heading'; level: number } & QuoteRichText)
  | { type: 'list'; ordered: boolean; items: QuoteRichListItem[]; more?: number }
  | ({ type: 'quote'; pull?: boolean; credit?: QuoteRichText } & QuoteRichText)
  | { type: 'pre'; text: string; language?: string }
  | { type: 'math'; text: string }
  | { type: 'divider' }
  | {
      type: 'table'
      rows: QuoteRichTableCell[][]
      /** Body rows dropped by the bot's own cap (the renderer adds its own). */
      more?: number
      compact?: boolean
      bordered?: boolean
      striped?: boolean
      caption?: QuoteRichText
    }
  | ({ type: 'details'; open?: boolean } & QuoteRichText)
  | ({ type: 'thinking' } & QuoteRichText)
  | ({ type: 'footer' } & QuoteRichText)
  /** Map / audio / voice / document: a short "icon + label" line. */
  | ({ type: 'label' } & QuoteRichText)

export interface QuoteRich {
  blocks: QuoteRichBlock[]
  rtl?: boolean
}

import type { QuoteFormat, QuoteType } from '../../services/quote-api/types'
import { buildBackgroundColor, DEFAULT_BACKGROUND, type ColorSpec } from './color'
import type { ParsedQuoteArgs } from './parse-args'

/** How the rendered image is delivered to the chat. */
export type QuoteDelivery = 'sticker' | 'photo' | 'document'

export interface RenderSpec {
  type: QuoteType
  format: QuoteFormat
  width: number
  height: number
  scale: number
  delivery: QuoteDelivery
}

/** Default emoji associated with a generated sticker. */
export const DEFAULT_STICKER_EMOJI = '💜'

/**
 * How a manual partial-quote selection (`/q` on a fragment of a replied message)
 * is rendered:
 *   - `framed` — show the fragment with the quote frame/highlight (current default).
 *   - `plain`  — show the fragment, but without the frame marking.
 *   - `off`    — ignore the selection entirely, quote the whole message.
 */
export type PartialQuoteMode = 'framed' | 'plain' | 'off'

/** Quote-level settings that survive in the DB (user or group `settings.quote`). */
export interface QuoteSettings {
  backgroundColor?: string | null
  emojiSuffix?: string | null
  emojiBrand?: string | null
  partialMode?: PartialQuoteMode | null
}

/**
 * Resolves the renderer dimensions/type from the parsed flags. Pure — ported
 * 1:1 from the legacy size math (512×768 @2×, inflated for image/png/stories),
 * but the delivery channel is derived from intent here instead of trusting the
 * response header downstream.
 */
export function resolveRenderSpec(flag: ParsedQuoteArgs): RenderSpec {
  let width = 512
  let height = 512 * 1.5
  let scale = 2

  if (flag.png || flag.img) {
    width *= 1.2
    height *= 15
    scale *= 1.5
  }

  let type: QuoteType = 'quote'
  if (flag.img || flag.png) type = 'image'

  if (flag.stories) {
    width *= 1.2
    height *= 15
    scale = 3
    type = 'stories'
  }

  const delivery: QuoteDelivery = flag.png ? 'document' : type === 'quote' ? 'sticker' : 'photo'
  const format: QuoteFormat = delivery === 'sticker' ? 'webp' : 'png'

  return { type, format, width, height, scale: flag.scale ?? scale, delivery }
}

/**
 * Resolves the background color string: explicit flag → group/user setting →
 * the renderer default. `rng` is injected so random colors stay testable.
 */
export function resolveBackgroundColor(
  flagColor: ColorSpec | undefined,
  setting: string | null | undefined,
  rng: () => number = Math.random,
): string {
  if (flagColor) return buildBackgroundColor(flagColor, rng)
  if (setting) return setting
  return DEFAULT_BACKGROUND
}

/** Sticker emoji list: the user/group suffix (unless `random`), else the heart. */
export function resolveStickerEmojis(suffix: string | null | undefined): string[] {
  if (suffix && suffix !== 'random') return [suffix]
  return [DEFAULT_STICKER_EMOJI]
}

/** The emoji brand (apple/google/…) for the renderer; defaults to apple. */
export function resolveEmojiBrand(setting: string | null | undefined): string {
  return setting || 'apple'
}

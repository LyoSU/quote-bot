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

/** Default output format when no `i`/`p`/`s` flag is given. */
export type QuoteFormatPref = 'sticker' | 'image' | 'png'

/** Quote-level settings that survive in the DB (user or group `settings.quote`). */
export interface QuoteSettings {
  backgroundColor?: string | null
  emojiSuffix?: string | null
  emojiBrand?: string | null
  partialMode?: PartialQuoteMode | null
  /** Default output format; the `i`/`p`/`s` command flags still override. */
  format?: QuoteFormatPref | null
  /** Default-on for the `m`/`r`/`c` flags (the command flag still overrides). */
  media?: boolean | null
  showReply?: boolean | null
  crop?: boolean | null
}

// Base sticker canvas: 512×768 at 2× (legacy proportions).
const BASE_WIDTH = 512
const BASE_HEIGHT = 512 * 1.5
// Image/PNG/stories widen the canvas slightly...
const WIDE_WIDTH_FACTOR = 1.2
// ...and lift the height ceiling hard: multi-message image/stories output can
// run very long, and the renderer ink-trims to the real content, so this is a
// generous upper bound the layout grows into, not the final height.
const TALL_HEIGHT_FACTOR = 15
// The renderer clamps scale to [1,20] server-side (methods/generate.js:109);
// mirror it here so `/q s100` behaves predictably instead of round-tripping a
// value the server will silently reject/clamp.
const SCALE_MIN = 1
const SCALE_MAX = 20

/**
 * Resolves the renderer dimensions/type from the parsed flags. Pure — ported
 * 1:1 from the legacy size math (512×768 @2×, inflated for image/png/stories),
 * but the delivery channel is derived from intent here instead of trusting the
 * response header downstream. Dimensions are rounded to integers and scale is
 * clamped to the renderer's accepted range.
 */
export function resolveRenderSpec(flag: ParsedQuoteArgs): RenderSpec {
  let width = BASE_WIDTH
  let height = BASE_HEIGHT
  let scale = 2

  if (flag.png || flag.img) {
    width *= WIDE_WIDTH_FACTOR
    height *= TALL_HEIGHT_FACTOR
    scale *= 1.5
  }

  let type: QuoteType = 'quote'
  if (flag.img || flag.png) type = 'image'

  if (flag.stories) {
    width *= WIDE_WIDTH_FACTOR
    height *= TALL_HEIGHT_FACTOR
    scale = 3
    type = 'stories'
  }

  const delivery: QuoteDelivery = flag.png ? 'document' : type === 'quote' ? 'sticker' : 'photo'
  const format: QuoteFormat = delivery === 'sticker' ? 'webp' : 'png'
  const rawScale = flag.scale ?? scale

  return {
    type,
    format,
    width: Math.round(width),
    height: Math.round(height),
    scale: Math.min(SCALE_MAX, Math.max(SCALE_MIN, rawScale)),
    delivery,
  }
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
  // A stored `random` preset isn't a renderer-valid color — roll a fresh
  // gradient each time, like the `/q random` flag does.
  if (setting === 'random') return buildBackgroundColor({ kind: 'random' }, rng)
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

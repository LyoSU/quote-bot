import { parseColor, type ColorSpec } from './color'

/**
 * Pure parser for `/q` arguments. Kept 1:1 with the legacy flag syntax (minus
 * the dropped AI `*` / free-text query and the `html` flag), but more
 * forgiving and self-explaining:
 *   - flags & scale are case-insensitive (`/q Reply S2`)
 *   - colors are recognized and normalized via {@link parseColor}
 *   - tokens we can't classify go into `unknown` so the handler can tell the
 *     user what wasn't understood, instead of silently rendering a black box.
 *
 * Token grammar (priority order):
 *   r | reply, p | png, i | img, rate, h | hidden, m | media, c | crop,
 *   s | stories                          → boolean flags
 *   s<number>  (s2, s1.5, s-1)           → scale
 *   <integer>  (3, -3)                   → count (negative = quote backwards)
 *   a color    (#hex, hex, name, rgb(),  → color
 *               a/b, //x, random, transparent)
 *   else                                 → unknown[]
 */
export interface ParsedQuoteArgs {
  reply: boolean
  png: boolean
  img: boolean
  rate: boolean
  hidden: boolean
  media: boolean
  crop: boolean
  stories: boolean
  count?: number
  scale?: number
  color?: ColorSpec
  unknown: string[]
}

const ALIASES = {
  reply: ['r', 'reply'],
  png: ['p', 'png'],
  img: ['i', 'img'],
  rate: ['rate'],
  hidden: ['h', 'hidden'],
  media: ['m', 'media'],
  crop: ['c', 'crop'],
  stories: ['s', 'stories'],
} as const

type BooleanFlag = keyof typeof ALIASES
const FLAG_KEYS = Object.keys(ALIASES) as BooleanFlag[]

const SCALE_RE = /^s([+-]?(?:\d*\.)?\d+)$/
const INT_RE = /^-?\d+$/

export function parseQuoteArgs(argString: string): ParsedQuoteArgs {
  const result: ParsedQuoteArgs = {
    reply: false,
    png: false,
    img: false,
    rate: false,
    hidden: false,
    media: false,
    crop: false,
    stories: false,
    unknown: [],
  }

  for (const token of argString.trim().split(/\s+/).filter(Boolean)) {
    const lower = token.toLowerCase()

    const flag = FLAG_KEYS.find((key) => (ALIASES[key] as readonly string[]).includes(lower))
    if (flag) {
      result[flag] = true
      continue
    }

    const scale = SCALE_RE.exec(lower)
    if (scale) {
      result.scale = parseFloat(scale[1]!)
      continue
    }

    if (result.count === undefined && INT_RE.test(token)) {
      result.count = parseInt(token, 10)
      continue
    }

    if (result.color === undefined) {
      const color = parseColor(token)
      if (color) {
        result.color = color
        continue
      }
    }

    result.unknown.push(token)
  }

  return result
}

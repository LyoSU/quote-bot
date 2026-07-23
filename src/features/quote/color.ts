/**
 * Color understanding for `/q`.
 *
 * The renderer (quote-api `parseBackgroundColor`) accepts three background
 * shapes — `A/B` (two-color gradient), `//X` (smart auto-gradient from one
 * color), and a single solid color — and resolves each side through
 * canvas `fillStyle`, i.e. ANY valid CSS color.
 *
 * The gap we close for users: canvas does NOT understand a bare hex like
 * `cbafff` (it reads it as an unknown name → black). So we recognise the user's
 * intent, normalise hex (adding `#`), validate against CSS names / hex / rgb,
 * and reject anything we don't understand instead of silently rendering black.
 *
 * Parsing is pure (`parseColor` → `ColorSpec`); randomness is injected at build
 * time (`buildBackgroundColor`) so it stays testable.
 */

export type ColorSpec =
  | { kind: 'transparent' }
  | { kind: 'solid'; color: string }
  | { kind: 'autoGradient'; base: string | 'random' }
  | { kind: 'gradient'; from: string | 'random'; to: string | 'random' }
  | { kind: 'random' }

/** The renderer's default background. */
export const DEFAULT_BACKGROUND = '//#292232'

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/
const RGB_RE = /^rgba?\(\d{1,3},\d{1,3},\d{1,3}(,(0|1|0?\.\d+))?\)$/

// The 148 CSS named colors (lowercased). Lets us tell `skyblue` (a color) from
// `skydive` (garbage) without a canvas.
const CSS_COLOR_NAMES = new Set<string>([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
  'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
  'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
  'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
  'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
  'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
  'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
  'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
  'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
  'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
  'whitesmoke', 'yellow', 'yellowgreen',
])

/** Normalize one color token to a renderer-valid string, or null if invalid. */
function normalizeOne(token: string): string | null {
  const t = token.trim().toLowerCase()
  if (!t) return null
  if (HEX_RE.test(t)) return `#${t.replace(/^#/, '')}`
  if (RGB_RE.test(t)) return t
  if (CSS_COLOR_NAMES.has(t)) return t
  return null
}

function normalizeSide(token: string): string | 'random' | null {
  if (token.trim().toLowerCase() === 'random') return 'random'
  return normalizeOne(token)
}

/** Recognize a color token's intent. Returns null if it isn't a color. */
export function parseColor(token: string): ColorSpec | null {
  const t = token.trim()
  const lower = t.toLowerCase()

  if (lower === 'transparent') return { kind: 'transparent' }
  if (lower === 'random') return { kind: 'random' }

  if (t.startsWith('//')) {
    const base = normalizeSide(t.slice(2))
    return base ? { kind: 'autoGradient', base } : null
  }

  if (t.includes('/')) {
    const [a, b] = t.split('/')
    const from = a !== undefined ? normalizeSide(a) : null
    const to = b !== undefined ? normalizeSide(b) : null
    return from && to ? { kind: 'gradient', from, to } : null
  }

  const solid = normalizeOne(t)
  return solid ? { kind: 'solid', color: solid } : null
}

/** A `#rrggbb` color from an injected RNG (defaults to Math.random). */
export function randomHexColor(rng: () => number = Math.random): string {
  const n = Math.floor(rng() * 0x1000000)
  return `#${n.toString(16).padStart(6, '0')}`
}

/** Build the renderer background string from a parsed spec. */
export function buildBackgroundColor(spec: ColorSpec, rng: () => number = Math.random): string {
  const side = (v: string | 'random'): string => (v === 'random' ? randomHexColor(rng) : v)
  switch (spec.kind) {
    case 'transparent':
      return 'rgba(0,0,0,0)'
    case 'solid':
      return spec.color
    case 'autoGradient':
      return `//${side(spec.base)}`
    case 'gradient':
      return `${side(spec.from)}/${side(spec.to)}`
    case 'random':
      return `${randomHexColor(rng)}/${randomHexColor(rng)}`
  }
}

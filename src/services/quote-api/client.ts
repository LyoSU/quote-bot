import { config } from '../../config/env'
import { logger } from '../../core/logger'
import type { QuoteGenerationRequest, QuoteGenerationResult } from './types'

const log = logger.child({ module: 'quote-api' })

const GENERATE_TIMEOUT_MS = 30_000

/** quote-api returned a 4xx/5xx with a parseable error message. */
export class QuoteApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'QuoteApiError'
  }
}

/** quote-api was unreachable (network error / timeout). */
export class QuoteApiUnavailableError extends Error {
  constructor(cause: unknown) {
    super('quote-api unreachable')
    this.name = 'QuoteApiUnavailableError'
    this.cause = cause
  }
}

/** Shape of quote-api's JSON error body: `{ ok:false, error:{ code, message } }`. */
interface QuoteApiErrorBody {
  ok: false
  error: { code: number; message: string }
}

function isErrorBody(value: unknown): value is QuoteApiErrorBody {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { error?: unknown }
  return typeof v.error === 'object' && v.error !== null && 'message' in v.error
}

async function readError(res: Response): Promise<QuoteApiError> {
  const text = await res.text().catch(() => '')
  try {
    const parsed: unknown = JSON.parse(text)
    if (isErrorBody(parsed)) return new QuoteApiError(parsed.error.message, res.status)
  } catch {
    // fall through to raw text
  }
  return new QuoteApiError(text || `HTTP ${res.status}`, res.status)
}

/**
 * POSTs a quote request to the renderer and returns the image bytes.
 *
 * Always hits `/generate.webp`; the `format` field in the body controls the
 * actual encoding (webp vs png), so the URL extension stays fixed.
 *
 * Throws {@link QuoteApiError} on a 4xx/5xx and {@link QuoteApiUnavailableError}
 * on a network failure or timeout — callers map these to user-facing messages.
 */
export async function generateQuote(request: QuoteGenerationRequest): Promise<QuoteGenerationResult> {
  const url = `${config.QUOTE_API_URI}/generate.webp`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Token goes in the body (quote-api merges query+body into props), never
      // the URL — keeps the secret out of access logs.
      body: JSON.stringify({ ...request, botToken: config.BOT_TOKEN }),
      signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
    })
  } catch (err) {
    log.warn({ err }, 'quote-api request failed')
    throw new QuoteApiUnavailableError(err)
  }

  if (!res.ok) throw await readError(res)

  const image = Buffer.from(await res.arrayBuffer())
  const headerNumber = (name: string): number | undefined => {
    const raw = res.headers.get(name)
    if (raw === null) return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }

  return {
    image,
    quoteType: res.headers.get('quote-type') ?? request.type,
    width: headerNumber('quote-width'),
    height: headerNumber('quote-height'),
  }
}

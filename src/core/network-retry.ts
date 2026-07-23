import { HttpError, type Transformer } from 'grammy'
import { logger } from './logger'
import { networkErrorsTotal } from './metrics'

const log = logger.child({ module: 'network-retry' })

/** grammY types the signal via its abort-controller shim, not the DOM lib. */
type ApiSignal = Parameters<Transformer>[3]

export interface NetworkRetryOptions {
  /** Retries after the initial call before the error is rethrown. */
  attempts?: number
  /** Cap for the exponential backoff between retries. */
  maxDelayMs?: number
}

/**
 * Retries API calls that fail at the network level (`HttpError`) — the local
 * Bot API server restarting after an OOM kill is the typical cause. Unlike
 * auto-retry's built-in handling (silent, unbounded, backoff accumulating up
 * to an hour), this bridges short outages loudly and gives up fast:
 *
 *   - each cycle is logged through pino and counted in Prometheus,
 *   - backoff is 1s → 2s → 4s → … capped at `maxDelayMs`,
 *   - after `attempts` retries the error is rethrown — handlers fail into the
 *     error boundary, getUpdates falls back to the runner's own retry loop.
 *
 * Install BELOW auto-retry (auto-retry must have `rethrowHttpErrors: true`,
 * or it would swallow what we rethrow). Telegram-level errors (429, 5xx) are
 * not touched here — that stays auto-retry's job.
 */
export function networkRetry(options: NetworkRetryOptions = {}): Transformer {
  const attempts = options.attempts ?? 5
  const maxDelayMs = options.maxDelayMs ?? 8_000

  return async (prev, method, payload, signal) => {
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await prev(method, payload, signal)
        if (attempt > 0) log.info({ method, attempt }, 'Bot API reachable again')
        return result
      } catch (err) {
        if (!(err instanceof HttpError)) throw err
        networkErrorsTotal.inc({ method })
        if (attempt >= attempts || signal?.aborted === true) {
          log.warn({ method, attempt, err: err.message }, 'Bot API unreachable, giving up')
          throw err
        }
        const delayMs = Math.min(maxDelayMs, 1_000 * 2 ** attempt)
        // First failure of a cycle at warn — one visible line per outage cycle.
        log[attempt === 0 ? 'warn' : 'debug'](
          { method, attempt, delayMs, err: err.message },
          'Bot API unreachable, retrying',
        )
        if (await sleep(delayMs, signal)) throw err // aborted mid-wait
      }
    }
  }
}

/** Abortable pause; resolves `true` when the signal aborted the wait. */
function sleep(ms: number, signal: ApiSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve(true)
      return
    }
    const onAbort = (): void => {
      clearTimeout(timer)
      resolve(true)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve(false)
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

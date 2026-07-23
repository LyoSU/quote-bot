import { LruCache } from '../../core/lru'
import { config } from '../../config/env'
import { quoteRateLimitedTotal } from '../../core/metrics'

/**
 * In-process flood control for the expensive quote pipeline (/q, /qrand):
 * every accepted command costs a render on quote-api plus several DB ops, so
 * load is shed HERE — before argument parsing and message fetching, the
 * cheapest possible point.
 *
 * Telegram's rate limiting (429 + retry_after, honored by auto-retry) still
 * backstops the send side; this gate exists so a flooding chat exhausts its
 * own budget instead of the renderer's capacity for everyone.
 */

interface Bucket {
  tokens: number
  /** When the bucket last earned tokens; keeps sub-token progress on refill. */
  refilledMs: number
}

/** Classic token bucket: `capacity` burst, one token back every `refillMs`. */
export class TokenBucket {
  private readonly buckets: LruCache<number, Bucket>

  constructor(
    private readonly capacity: number,
    private readonly refillMs: number,
    maxKeys = 10_000,
  ) {
    // TTL = one full refill: an expired/evicted bucket and a fresh full one
    // are indistinguishable, so dropping idle state is lossless.
    this.buckets = new LruCache(maxKeys, capacity * refillMs)
  }

  /** Whether `key` has a token available — does not consume it. */
  has(key: number, nowMs: number): boolean {
    const bucket = this.buckets.get(key)
    if (!bucket) return true
    this.refill(bucket, nowMs)
    return bucket.tokens > 0
  }

  /** Consumes one token (call after `has` cleared every gate). */
  take(key: number, nowMs: number): void {
    let bucket = this.buckets.get(key)
    if (!bucket) {
      bucket = { tokens: this.capacity, refilledMs: nowMs }
      this.buckets.set(key, bucket)
    } else {
      this.refill(bucket, nowMs)
    }
    if (bucket.tokens > 0) bucket.tokens--
  }

  /** Seconds until `key` earns its next token — for the user-facing notice. */
  retryAfterSeconds(key: number, nowMs: number): number {
    const bucket = this.buckets.get(key)
    if (!bucket || bucket.tokens > 0) return 0
    return Math.max(1, Math.ceil((bucket.refilledMs + this.refillMs - nowMs) / 1000))
  }

  private refill(bucket: Bucket, nowMs: number): void {
    const earned = Math.floor((nowMs - bucket.refilledMs) / this.refillMs)
    if (earned <= 0) return
    bucket.tokens = Math.min(this.capacity, bucket.tokens + earned)
    bucket.refilledMs =
      bucket.tokens >= this.capacity ? nowMs : bucket.refilledMs + earned * this.refillMs
  }
}

/**
 * Deliberately light budgets — the gate is anti-flood, not anti-usage: a human
 * redoing an accidental /q must never notice it, only sustained spam should.
 */
/** Per-sender budget: a 5-quote burst, then one per 3s. */
const perUser = new TokenBucket(5, 3_000)
/** Per-group budget: shared by everyone in the chat, a 10-quote burst, then one per 1.5s. */
const perChat = new TokenBucket(10, 1_500)
/** At most one "slow down" reply per chat per this window; then drop silently. */
const NOTICE_INTERVAL_MS = 30_000
const noticed = new LruCache<number, true>(10_000, NOTICE_INTERVAL_MS)

export type RateDecision =
  | { ok: true }
  | { ok: false; notify: boolean; retryAfterSeconds: number }

/**
 * Both gates must clear before either is charged, so a rejection never drains
 * the other bucket — one flooding user must not eat the whole chat's budget.
 * The notice is itself rate-limited (once per chat per interval): replying to
 * every rejected command would turn overload into MORE outgoing traffic.
 */
export function checkQuoteRate(
  userId: number | undefined,
  chatId: number,
  nowMs: number = Date.now(),
): RateDecision {
  if (userId !== undefined && userId === config.ADMIN_ID) return { ok: true }

  const inGroup = chatId < 0
  const userOk = userId === undefined || perUser.has(userId, nowMs)
  const chatOk = !inGroup || perChat.has(chatId, nowMs)
  if (userOk && chatOk) {
    if (userId !== undefined) perUser.take(userId, nowMs)
    if (inGroup) perChat.take(chatId, nowMs)
    return { ok: true }
  }

  quoteRateLimitedTotal.inc()
  const retryAfterSeconds = Math.max(
    userId !== undefined ? perUser.retryAfterSeconds(userId, nowMs) : 0,
    inGroup ? perChat.retryAfterSeconds(chatId, nowMs) : 0,
    1,
  )
  const notify = noticed.get(chatId) === undefined
  if (notify) noticed.set(chatId, true)
  return { ok: false, notify, retryAfterSeconds }
}

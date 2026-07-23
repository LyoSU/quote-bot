import { Registry, collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client'

/**
 * Prometheus registry. Exposed over HTTP at /metrics (see health/server).
 * This is where high-frequency, high-cardinality numbers belong — never the
 * text log.
 */
export const registry = new Registry()

collectDefaultMetrics({ register: registry })

/** Every update we receive, split by whether the fast-path deemed it relevant. */
export const updatesTotal = new Counter({
  name: 'bot_updates_total',
  help: 'Total updates received, by relevance',
  labelNames: ['relevant'] as const,
  registers: [registry],
})

/**
 * getUpdates polls by wire outcome. `empty` climbing while `updates` flatlines
 * is the signature of a Bot API server that polls fine but delivers nothing
 * (lost Telegram session / queue stuck elsewhere) — invisible to error counts.
 */
export const pollsTotal = new Counter({
  name: 'bot_getupdates_total',
  help: 'getUpdates polls, by outcome (updates | empty | error)',
  labelNames: ['outcome'] as const,
  registers: [registry],
})

/** Network-level failures (HttpError) talking to the Bot API server. */
export const networkErrorsTotal = new Counter({
  name: 'bot_network_errors_total',
  help: 'Network errors while calling the Bot API, by method',
  labelNames: ['method'] as const,
  registers: [registry],
})

/**
 * Context-cache effectiveness: user/group lookups served from memory vs the
 * database. A healthy hit rate is ~90%+; a drop means the access pattern
 * stopped matching the cache sizing (see the repositories).
 */
export const contextCacheTotal = new Counter({
  name: 'bot_context_cache_total',
  help: 'Context (user/group) cache lookups by entity and outcome',
  labelNames: ['entity', 'outcome'] as const,
  registers: [registry],
})

/**
 * Polling-health gauges, sampled on each /metrics scrape. Together they
 * separate the two ways the bot can "stop collecting updates":
 *   - in_flight pinned at the concurrency cap + poll age growing → the sink is
 *     saturated (handlers stuck on something slow — sends, DB, renderer);
 *   - in_flight near zero + poll age growing → polling itself is dead.
 */
let pollingGaugesRegistered = false

export function registerPollingGauges(
  runner: { size(): number },
  poll: { ageSeconds(): number },
): void {
  // prom-client throws on a duplicate metric name; make a second call a no-op.
  if (pollingGaugesRegistered) return
  pollingGaugesRegistered = true

  new Gauge({
    name: 'bot_runner_in_flight',
    help: 'Updates currently being processed by the runner sink',
    registers: [registry],
    collect() {
      this.set(runner.size())
    },
  })
  new Gauge({
    name: 'bot_poll_age_seconds',
    help: 'Seconds since the last successful getUpdates',
    registers: [registry],
    collect() {
      this.set(poll.ageSeconds())
    },
  })
}

/** Wall-clock time spent in the handler chain for relevant updates. */
export const updateDuration = new Histogram({
  name: 'bot_update_duration_seconds',
  help: 'Handler chain duration for relevant updates',
  labelNames: ['ok'] as const,
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 3, 10],
  registers: [registry],
})

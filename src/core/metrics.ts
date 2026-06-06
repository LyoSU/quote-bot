import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client'

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

/** Network-level failures (HttpError) talking to the Bot API server. */
export const networkErrorsTotal = new Counter({
  name: 'bot_network_errors_total',
  help: 'Network errors while calling the Bot API, by method',
  labelNames: ['method'] as const,
  registers: [registry],
})

/** Wall-clock time spent in the handler chain for relevant updates. */
export const updateDuration = new Histogram({
  name: 'bot_update_duration_seconds',
  help: 'Handler chain duration for relevant updates',
  labelNames: ['ok'] as const,
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 3, 10],
  registers: [registry],
})

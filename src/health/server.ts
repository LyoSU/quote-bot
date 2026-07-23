import { createServer, type Server } from 'node:http'
import { config } from '../config/env'
import { logger } from '../core/logger'
import { registry } from '../core/metrics'

const log = logger.child({ module: 'health' })

/** One readiness snapshot: the verdict plus the per-component evidence. */
export interface HealthReport {
  /** True when the bot is able to serve traffic. Drives orchestrator restarts. */
  ok: boolean
  /** Included in the /health body and in transition logs — the first thing an
   * incident responder sees should already say WHICH component failed. */
  detail: Record<string, boolean | number>
}

export interface HealthState {
  check: () => HealthReport
}

/**
 * Tiny HTTP server exposing:
 *   GET /health   → 200 ok / 503 unhealthy   (for PM2/k8s liveness & readiness)
 *   GET /metrics  → Prometheus exposition format
 *
 * Deliberately dependency-free (node:http) — it must stay up even when the bot
 * machinery is degraded, so a probe can report the degradation. Health
 * transitions are logged once per flip (not per probe), so the log tells when
 * the bot went unhealthy and why even if nobody was watching the endpoint.
 */
export function startHealthServer(
  state: HealthState,
  port: number = config.HEALTH_PORT,
  host: string | undefined = config.HEALTH_HOST,
): Server {
  let lastOk: boolean | undefined

  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/health') {
        const { ok, detail } = state.check()
        if (ok !== lastOk) {
          log[ok ? 'info' : 'warn'](detail, ok ? 'health: ok' : 'health: unhealthy')
          lastOk = ok
        }
        res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ status: ok ? 'ok' : 'unhealthy', ...detail }))
        return
      }
      if (req.url === '/metrics') {
        res.writeHead(200, { 'content-type': registry.contentType })
        res.end(await registry.metrics())
        return
      }
      res.writeHead(404)
      res.end()
    } catch (err) {
      log.error({ err }, 'Health endpoint error')
      res.writeHead(500)
      res.end()
    }
  })

  server.listen(port, host, () => {
    log.info({ port, host: host ?? '0.0.0.0' }, 'Health endpoint listening')
  })

  return server
}

import { createServer, type Server } from 'node:http'
import { config } from '../config/env'
import { logger } from '../core/logger'
import { registry } from '../core/metrics'

export interface HealthState {
  /** True when the bot is able to serve traffic. Drives orchestrator restarts. */
  ready: () => boolean
}

/**
 * Tiny HTTP server exposing:
 *   GET /health   → 200 ok / 503 unhealthy   (for PM2/k8s liveness & readiness)
 *   GET /metrics  → Prometheus exposition format
 *
 * Deliberately dependency-free (node:http) — it must stay up even when the bot
 * machinery is degraded, so a probe can report the degradation.
 */
export function startHealthServer(state: HealthState): Server {
  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/health') {
        const ok = state.ready()
        res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ status: ok ? 'ok' : 'unhealthy' }))
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
      logger.error({ err }, 'Health endpoint error')
      res.writeHead(500)
      res.end()
    }
  })

  server.listen(config.HEALTH_PORT, () => {
    logger.info({ port: config.HEALTH_PORT }, 'Health endpoint listening')
  })

  return server
}

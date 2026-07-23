import { pino, type Logger } from 'pino'
import { config, isProduction } from '../config/env'

/**
 * Application logger.
 *
 * Philosophy: log *events*, not *updates*. At 1000 RPS a log line per update
 * is 86M lines/day of unreadable noise. We log lifecycle, degradation and real
 * failures; high-cardinality counters live in Prometheus (see core/metrics).
 *
 * - dev:  pretty, colorized, human-friendly.
 * - prod: structured JSON on stdout for log aggregators.
 *
 * `base: undefined` drops pid/hostname from every line — clean output.
 */
export const logger: Logger = pino({
  level: config.LOG_LEVEL,
  base: undefined,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
})

export type { Logger }

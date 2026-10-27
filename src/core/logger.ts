import { pino, type Logger } from 'pino'
import { config, isProduction } from '../config/env'
import { redactDeep, redactSecrets } from './redact'

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
  // Last line of defence: a bot token embedded in an error/URL never reaches the log.
  hooks: {
    logMethod(args, method) {
      const clean = args.map((a) => (typeof a === 'string' ? redactSecrets(a) : redactDeep(a)))
      return method.apply(this, clean as Parameters<typeof method>)
    },
  },
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

import type { RunnerHandle } from '@grammyjs/runner'
import { logger } from './logger'

type Closer = () => Promise<void> | void

interface Resource {
  name: string
  close: Closer
}

const resources: Resource[] = []

type ShutdownFn = (signal: string, exitCode?: number) => void
let triggerShutdown: ShutdownFn | null = null

/**
 * Programmatic shutdown for fatal-but-detectable states (e.g. the Bot API
 * session got logged out): drains in-flight work like a signal would, then
 * exits with the given code so the supervisor restarts the process.
 */
export function requestShutdown(reason: string, exitCode = 1): void {
  if (triggerShutdown) triggerShutdown(reason, exitCode)
  else process.exit(exitCode)
}

/**
 * Register a resource to be closed on shutdown (db, http server).
 * Resources are closed in reverse registration order (LIFO), mirroring setup.
 */
export function onShutdown(name: string, close: Closer): void {
  resources.push({ name, close })
}

/**
 * Wires SIGINT/SIGTERM to a graceful shutdown: stop polling, let in-flight
 * updates drain, then close every registered resource. Also installs last-line
 * handlers for uncaught errors so the process never lingers in a zombie state.
 */
export function installSignalHandlers(runner: RunnerHandle): void {
  let shuttingDown = false

  const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'Graceful shutdown started')

    // Hard deadline. PM2 force-kills only after a signal it sent itself; a
    // self-initiated shutdown stuck on draining (e.g. a handler waiting in
    // the send-throttler queue) would otherwise become an unwatched zombie.
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit')
      process.exit(exitCode)
    }, 30_000).unref()

    try {
      if (runner.isRunning()) {
        await runner.stop()
        logger.info('Polling stopped, in-flight updates drained')
      }
      for (const resource of [...resources].reverse()) {
        try {
          await resource.close()
          logger.info({ resource: resource.name }, 'Resource closed')
        } catch (err) {
          logger.error({ resource: resource.name, err }, 'Error closing resource')
        }
      }
    } finally {
      logger.info('Shutdown complete')
      // Non-zero on fatal paths so `restart: on-failure` policies kick in.
      process.exit(exitCode)
    }
  }

  triggerShutdown = (signal, exitCode) => void shutdown(signal, exitCode)

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException — shutting down')
    void shutdown('uncaughtException', 1)
  })
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'unhandledRejection — shutting down')
    void shutdown('unhandledRejection', 1)
  })
}

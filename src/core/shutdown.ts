import type { RunnerHandle } from '@grammyjs/runner'
import { logger } from './logger'

type Closer = () => Promise<void> | void

interface Resource {
  name: string
  close: Closer
}

const resources: Resource[] = []

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

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'Graceful shutdown started')

    try {
      if (runner.isRunning()) {
        await runner.stop()
        logger.info('Polling stopped, in-flight updates drained')
      }
      for (const resource of resources.reverse()) {
        try {
          await resource.close()
          logger.info({ resource: resource.name }, 'Resource closed')
        } catch (err) {
          logger.error({ resource: resource.name, err }, 'Error closing resource')
        }
      }
    } finally {
      logger.info('Shutdown complete')
      process.exit(0)
    }
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException — shutting down')
    void shutdown('uncaughtException')
  })
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'unhandledRejection — shutting down')
    void shutdown('unhandledRejection')
  })
}

import mongoose, { type Connection } from 'mongoose'
import { config } from '../config/env'
import { logger } from '../core/logger'
import { onShutdown } from '../core/shutdown'

const log = logger.child({ module: 'db' })

/**
 * Dedicated Mongo connection (not the global mongoose singleton) — models bind
 * to it explicitly, so there is no hidden global state.
 *
 * Pool/timeout values mirror the tuned production config. `autoIndex` /
 * `autoCreate` are off on purpose: indexes on the multi-million-row collections
 * are managed out-of-band, and building them at boot would just slow startup.
 */
export const connection: Connection = mongoose.createConnection(config.MONGODB_URI, {
  maxPoolSize: config.MONGO_MAX_POOL,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  maxIdleTimeMS: 30_000,
  retryWrites: true,
  retryReads: true,
  autoIndex: false,
  autoCreate: false,
})

connection.on('connected', () => log.info('MongoDB connected'))
connection.on('disconnected', () => log.warn('MongoDB disconnected'))
connection.on('reconnected', () => log.info('MongoDB reconnected'))
connection.on('error', (err) => log.error({ err }, 'MongoDB connection error'))

onShutdown('mongodb', () => connection.close())

/** True once the driver has selected a server and is ready for queries. */
export function isDatabaseReady(): boolean {
  return connection.readyState === 1
}

/** Resolves when the initial connection is established (or rejects on failure). */
export function waitForDatabase(): Promise<void> {
  return connection.asPromise().then(() => undefined)
}

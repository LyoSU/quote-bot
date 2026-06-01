import path from 'node:path'
import { configure, createClient, type Client } from 'tdl'
import { getTdjson } from 'prebuilt-tdlib'
import { config } from '../../config/env'
import { logger } from '../../core/logger'

const log = logger.child({ module: 'tdlib' })

export class TdlibUnavailableError extends Error {
  constructor(reason: string) {
    super(`TDLib unavailable: ${reason}`)
    this.name = 'TdlibUnavailableError'
  }
}

export class TdlibTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`TDLib '${label}' timed out after ${ms}ms`)
    this.name = 'TdlibTimeoutError'
  }
}

const INVOKE_TIMEOUT_MS = 10_000
const BREAKER_THRESHOLD = 5
const BREAKER_COOLDOWN_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TdlibTimeoutError(label, ms)), ms)
    timer.unref?.()
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

let tdlConfigured = false
function configureOnce(): void {
  if (tdlConfigured) return
  try {
    configure({ tdjson: getTdjson(), verbosityLevel: 0 })
  } catch (err) {
    log.warn({ err }, 'prebuilt-tdlib unavailable; falling back to local libdir')
    configure({ libdir: path.resolve(__dirname, 'data'), verbosityLevel: 0 })
  }
  tdlConfigured = true
}

/**
 * Owns the single in-process TDLib client: connection lifecycle, lazy
 * reconnection, a circuit breaker, and per-call timeouts. All access to TDLib
 * goes through {@link run}.
 */
export class TdlibClient {
  private client: Client | null = null
  private connecting: Promise<void> | null = null
  private consecutiveFailures = 0
  private breakerOpenedAt = 0

  get enabled(): boolean {
    return !config.DISABLE_TDLIB && Boolean(config.TELEGRAM_API_ID) && Boolean(config.TELEGRAM_API_HASH)
  }

  private get breakerOpen(): boolean {
    if (this.consecutiveFailures < BREAKER_THRESHOLD) return false
    if (Date.now() - this.breakerOpenedAt > BREAKER_COOLDOWN_MS) return false // cooldown elapsed → half-open
    return true
  }

  isHealthy(): boolean {
    return this.enabled && this.client !== null && !this.breakerOpen
  }

  connect(): Promise<void> {
    if (!this.enabled) return Promise.resolve()
    if (this.client) return Promise.resolve()
    if (this.connecting) return this.connecting
    this.connecting = this.doConnect().finally(() => {
      this.connecting = null
    })
    return this.connecting
  }

  private async doConnect(): Promise<void> {
    configureOnce()
    const dataDir = path.resolve(__dirname, 'data')
    const client = createClient({
      apiId: config.TELEGRAM_API_ID!,
      apiHash: config.TELEGRAM_API_HASH!,
      databaseDirectory: path.join(dataDir, 'db'),
      filesDirectory: dataDir,
      tdlibParameters: {
        use_message_database: false,
        use_chat_info_database: false,
        use_file_database: false,
      },
    })

    client.on('error', (err) => log.error({ err }, 'TDLib client error'))
    client.on('close', () => {
      log.warn('TDLib client closed; will reconnect lazily on next call')
      this.client = null
    })

    await client.loginAsBot(config.BOT_TOKEN)
    this.client = client
    this.consecutiveFailures = 0
    log.info('TDLib connected')
  }

  /** Manually drop the connection so the next call reconnects fresh. */
  async reconnect(): Promise<void> {
    this.consecutiveFailures = 0
    const old = this.client
    this.client = null
    if (old) await old.close().catch(() => {})
    await this.connect()
  }

  async close(): Promise<void> {
    const c = this.client
    this.client = null
    if (c) await c.close().catch(() => {})
  }

  /**
   * Runs a typed TDLib operation with the connected client, applying the
   * circuit breaker and a timeout. `op` receives the live client so
   * `client.invoke(...)` stays fully typed.
   */
  async run<T>(label: string, op: (client: Client) => Promise<T>): Promise<T> {
    if (!this.enabled) throw new TdlibUnavailableError('disabled or missing credentials')
    if (this.breakerOpen) throw new TdlibUnavailableError('circuit breaker open')

    if (!this.client) await this.connect()
    if (!this.client) throw new TdlibUnavailableError('not connected')

    try {
      const result = await withTimeout(op(this.client), INVOKE_TIMEOUT_MS, label)
      this.consecutiveFailures = 0
      return result
    } catch (err) {
      this.consecutiveFailures++
      if (this.consecutiveFailures >= BREAKER_THRESHOLD) this.breakerOpenedAt = Date.now()
      throw err
    }
  }
}

export const tdlibClient = new TdlibClient()

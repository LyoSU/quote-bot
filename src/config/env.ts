import { resolve } from 'node:path'
import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

// Anchor .env to the project root, NOT process.cwd(): under PM2/cron the
// process may start from any directory, and a silently missed .env flips
// BOT_API_ROOT back to the cloud default — the poller then asks
// api.telegram.org, which answers "Logged out" for a locally migrated token.
loadDotenv({ path: resolve(__dirname, '../../.env') })

/**
 * Single source of truth for runtime configuration.
 *
 * Everything the process needs is read from the environment, validated here,
 * and exported as a typed, frozen object. If anything is missing or malformed
 * the process dies immediately with a readable report — no `undefined`
 * surfacing deep in a request handler hours later. This replaces the old
 * `config.json` file-read + in-memory cache.
 *
 * Only variables the current foundation needs are declared. Each later
 * sub-project (db, quote-api, …) extends this schema with its own keys.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  /** Telegram Bot API token. The one thing we cannot run without. */
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),

  /** MongoDB connection string. */
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  /**
   * Mongo connection pool ceiling. Each /q fans out to ~8 ops; under load a
   * small pool stalls session reads behind a free connection. Default mirrors
   * the tuned production value.
   */
  MONGO_MAX_POOL: z.coerce.number().int().positive().default(50),

  /** How often aggregated RPS/latency stats are written to the Stats collection. */
  STATS_FLUSH_MS: z.coerce.number().int().positive().default(60_000),

  /** quote-api base URL (the image renderer). */
  QUOTE_API_URI: z.string().min(1, 'QUOTE_API_URI is required'),

  /** Mini App deep-link config (https://t.me/<bot>/<short>?startapp=...). */
  MINI_APP_SHORT_NAME: z.string().default('app'),
  MINI_APP_URL: z.string().optional(),

  /**
   * Bot API server root. Defaults to the Telegram cloud. Pointing it at the
   * self-hosted fork (e.g. https://tg-api.yuri.ly) routes ALL bot traffic
   * through it and unlocks the custom methods (getMessages, getUserInfo)
   * used for multi-message quotes and premium emoji statuses.
   */
  BOT_API_ROOT: z
    .url()
    .default('https://api.telegram.org')
    .transform((v) => v.replace(/\/+$/, '')),

  /** gramads token (https://gramads.net). Ads are shown only to ru-locale users in PM. */
  GRAMADS_TOKEN: z.string().optional(),

  /** Bot owner's Telegram id. Gates privileged commands (e.g. /refund). */
  ADMIN_ID: z.coerce.number().int().positive().optional(),

  /** Port for the health + Prometheus metrics HTTP endpoint. */
  HEALTH_PORT: z.coerce.number().int().positive().default(3000),

  /**
   * Interface for the health endpoint. Unset = all interfaces (0.0.0.0) —
   * mind that on a host-networked box this exposes /metrics publicly; set
   * 127.0.0.1 (or an internal interface) unless an external prober needs it.
   */
  HEALTH_HOST: z.string().optional(),

  /**
   * Max updates the runner processes concurrently across all chats.
   * Per-chat ordering is still guaranteed by sequentialize().
   */
  BOT_CONCURRENCY: z.coerce.number().int().positive().default(500),
})

export type AppConfig = Readonly<z.infer<typeof EnvSchema>>

function loadConfig(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env)

  if (!parsed.success) {
    // The logger isn't up yet (it depends on this config), so print plainly.
    const report = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    console.error(`\n✖ Invalid environment configuration:\n${report}\n`)
    process.exit(1)
  }

  return Object.freeze(parsed.data)
}

export const config = loadConfig()

export const isProduction = config.NODE_ENV === 'production'

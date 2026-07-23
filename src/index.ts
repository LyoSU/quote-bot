import { config } from './config/env'
import { logger } from './core/logger'
import { createBot } from './core/bot'
import { startRunner } from './core/runner'
import { installSignalHandlers, onShutdown } from './core/shutdown'
import { pollWatch, startStallWatchdog } from './core/poll-watch'
import { registerPollingGauges } from './core/metrics'
import { startHealthServer } from './health/server'
import { waitForDatabase, isDatabaseReady } from './db/connection'
import { verifyDatabase } from './db/verify'
import { contextMiddleware } from './middlewares/context'
import { i18nMiddleware } from './i18n'
import { features } from './features'
import { statsService } from './services/stats/stats-service'

/**
 * Composition root. The only file allowed to wire concrete pieces together;
 * everything else stays a pure, testable module.
 *
 * Boot order: config (loaded on import) → database → bot (core stack) →
 * context + features → polling → health → signal handlers.
 */
async function main(): Promise<void> {
  logger.info({ env: config.NODE_ENV }, 'Starting quote-bot on grammY')
  if (process.env['BOT_API_ROOT'] === undefined) {
    // Catches a lost .env / stripped PM2 env early — silently polling the
    // cloud with a locally migrated token yields only "Logged out".
    logger.warn('BOT_API_ROOT is not set — ALL bot traffic goes to the Telegram cloud')
  }

  await waitForDatabase()
  logger.info('Database ready')
  // Warn-only: indexes/capped collections are managed out-of-band (autoIndex
  // off). Fire-and-forget so a slow admin call never delays polling.
  void verifyDatabase()

  const bot = createBot()
  bot.use(contextMiddleware) // resolves ctx.user / ctx.group
  bot.use(i18nMiddleware) // negotiates locale from the resolved user/group
  bot.use(features)

  await bot.init() // fetch getMe so ctx.me is available inside handlers
  logger.info(
    { username: bot.botInfo.username, id: bot.botInfo.id, apiRoot: config.BOT_API_ROOT },
    'Bot authorized',
  )

  statsService.start()
  const runner = startRunner(bot)
  registerPollingGauges(runner, pollWatch)
  startStallWatchdog(runner)

  const health = startHealthServer({
    // pollWatch catches the case the runner can't see: the Bot API server is
    // down and getUpdates has been failing — "running" but processing nothing.
    ready: () => runner.isRunning() && isDatabaseReady() && pollWatch.isFresh(),
  })
  onShutdown(
    'health-server',
    () => new Promise<void>((resolve) => health.close(() => resolve())),
  )

  installSignalHandlers(runner)
  logger.info('quote-bot is up and polling')
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup')
  process.exit(1)
})

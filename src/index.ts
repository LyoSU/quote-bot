import { config } from './config/env'
import { logger } from './core/logger'
import { createBot } from './core/bot'
import { startRunner } from './core/runner'
import { installSignalHandlers, onShutdown } from './core/shutdown'
import { startHealthServer } from './health/server'
import { waitForDatabase, isDatabaseReady } from './db/connection'
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

  await waitForDatabase()
  logger.info('Database ready')

  const bot = createBot()
  bot.use(contextMiddleware) // resolves ctx.user / ctx.group
  bot.use(i18nMiddleware) // negotiates locale from the resolved user/group
  bot.use(features)

  await bot.init() // fetch getMe so ctx.me is available inside handlers
  logger.info({ username: bot.botInfo.username, id: bot.botInfo.id }, 'Bot authorized')

  statsService.start()
  const runner = startRunner(bot)

  const health = startHealthServer({
    ready: () => runner.isRunning() && isDatabaseReady(),
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

import { Composer } from 'grammy'
import type { BotContext } from '../core/types'
import { ping } from './ping'
import { shellFeature } from './shell'
import { settingsFeature } from './settings'
import { quoteSettingsMenu } from './settings/menu'
import { paymentsFeature } from './payments'
import { inlineFeature } from './inline'
import { fstikFeature } from './fstik'
import { quoteFeature } from './quote'

/**
 * Aggregates every feature composer into one, mounted by the composition root
 * after the context middleware.
 *
 * Order matters: specific commands and callbacks (shell, settings, payments,
 * inline, fstik) are matched before the quote feature, whose private-chat
 * catch-all turns any non-command message into a quote.
 */
export const features = new Composer<BotContext>()

features.use(ping)
features.use(shellFeature)
features.use(settingsFeature)
features.use(quoteSettingsMenu)
features.use(paymentsFeature)
features.use(inlineFeature)
features.use(fstikFeature)
features.use(quoteFeature)

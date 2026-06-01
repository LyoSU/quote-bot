import path from 'node:path'
import { I18n } from '@grammyjs/i18n'
import type { BotContext } from '../core/types'

export const DEFAULT_LOCALE = 'en'

/**
 * Resolves the locale for an update. Group language wins inside groups
 * (matches the legacy behavior where group-get overrode user-get); otherwise
 * the user's chosen language, then their Telegram client language, then the
 * default.
 */
function negotiateLocale(ctx: BotContext): string {
  const fromGroup = ctx.group?.settings?.locale
  const fromUser = ctx.user?.settings?.locale
  const fromClient = ctx.from?.language_code?.split('-')[0]
  return fromGroup || fromUser || fromClient || DEFAULT_LOCALE
}

export const i18n = new I18n<BotContext>({
  defaultLocale: DEFAULT_LOCALE,
  // useIsolating:false — Fluent otherwise wraps variables in invisible
  // U+2068/2069 isolation marks that corrupt Telegram HTML.
  fluentBundleOptions: { useIsolating: false },
  localeNegotiator: negotiateLocale,
  // Common variable available in every string without passing it explicitly.
  globalTranslationContext: (ctx) => ({ botUsername: ctx.me?.username ?? '' }),
})

// Load the .ftl files. __dirname resolves to src/i18n in dev and dist/i18n in
// prod (build copies the locales folder), so this works in both.
i18n.loadLocalesDirSync(path.join(__dirname, 'locales'))

export const i18nMiddleware = i18n.middleware()

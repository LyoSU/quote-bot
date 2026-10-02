import type { Api } from 'grammy'
import { config } from '../config/env'
import { logger } from './logger'
import { DEFAULT_LOCALE, i18n } from '../i18n'

/**
 * Sets the default private-chat menu button to open the Mini App. No-op unless
 * MINI_APP_URL is a direct https URL (web_app buttons can't use t.me links).
 * Never throws — a failure here must not stop the bot from starting.
 */
export async function setupMenuButton(api: Pick<Api, 'setChatMenuButton'>, url: string | undefined = config.MINI_APP_URL): Promise<boolean> {
  if (!url || !url.startsWith('https://')) return false
  try {
    await api.setChatMenuButton({
      menu_button: { type: 'web_app', text: i18n.t(DEFAULT_LOCALE, 'app-menu_button'), web_app: { url } },
    })
    return true
  } catch (err) {
    logger.warn({ err }, 'Failed to set the Mini App menu button')
    return false
  }
}

import type { Api } from 'grammy'
import type { BotCommand, BotCommandScope, LanguageCode } from 'grammy/types'
import { logger } from './logger'
import { DEFAULT_LOCALE, i18n } from '../i18n'

type Audience = 'private' | 'group' | 'admin'

interface CommandSpec {
  command: string
  /**
   * Typed invisibly to the rest of the chat (Bot API 10.2+). Its handler must
   * answer through `replyPrivately` — a public reply would expose it.
   */
  ephemeral?: boolean
  for: Audience[]
}

/**
 * The command menu, per audience. Only the commands worth discovering are
 * listed: the legacy one-setting commands (/qcolor, /qb, /hidden, …) still work
 * but are superseded by the /qsettings menu, so they stay out of it.
 */
export const COMMANDS: readonly CommandSpec[] = [
  { command: 'q', for: ['group', 'admin'] },
  { command: 'qrand', for: ['group', 'admin'] },
  { command: 'qtop', for: ['group', 'admin'] },
  { command: 'qfind', ephemeral: true, for: ['group', 'admin'] },
  { command: 'qforget', ephemeral: true, for: ['group', 'admin'] },
  { command: 'qsettings', ephemeral: true, for: ['private', 'admin'] },
  { command: 'lang', ephemeral: true, for: ['private', 'admin'] },
  { command: 'start', for: ['private'] },
  { command: 'app', for: ['private', 'group', 'admin'] },
  { command: 'help', ephemeral: true, for: ['private', 'group', 'admin'] },
  { command: 'donate', for: ['private'] },
]

const SCOPES: Record<Audience, BotCommandScope> = {
  private: { type: 'all_private_chats' },
  group: { type: 'all_group_chats' },
  // Admins see their own list (it falls back past all_group_chats), so it
  // repeats the member commands plus the admin-only ones.
  admin: { type: 'all_chat_administrators' },
}

/** The localized menu for one audience. `is_ephemeral` only means something in groups. */
export function commandsFor(audience: Audience, t: (key: string) => string): BotCommand[] {
  return COMMANDS.filter((c) => c.for.includes(audience)).map((c) => ({
    command: c.command,
    description: t(`cmd-${c.command}`),
    ...(c.ephemeral && audience !== 'private' ? { is_ephemeral: true } : {}),
  }))
}

/**
 * Publishes the command menu for every audience and locale (the default list
 * uses DEFAULT_LOCALE for clients in other languages). Runs in the background
 * on startup; never throws — a stale menu must not stop the bot.
 */
export async function setupCommands(api: Pick<Api, 'setMyCommands'>): Promise<void> {
  try {
    for (const audience of Object.keys(SCOPES) as Audience[]) {
      const scope = SCOPES[audience]
      await api.setMyCommands(commandsFor(audience, (k) => i18n.t(DEFAULT_LOCALE, k)), { scope })
      for (const code of i18n.locales) {
        await api.setMyCommands(commandsFor(audience, (k) => i18n.t(code, k)), { scope, language_code: code as LanguageCode })
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to publish the bot command menu')
  }
}

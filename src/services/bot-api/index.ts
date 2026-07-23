import { config } from '../../config/env'
import { BotApiService } from './service'

/** App-wide instance, bound to the configured Bot API root. */
export const botApi = new BotApiService({ root: config.BOT_API_ROOT, token: config.BOT_TOKEN })

export { BotApiService } from './service'
export type { ApiMessage, ApiUser, ApiUserInfo, ApiChat, ApiForwardOrigin } from './types'

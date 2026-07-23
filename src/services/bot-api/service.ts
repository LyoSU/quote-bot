import { logger } from '../../core/logger'
import { LruCache } from '../../core/lru'
import type { ApiMessage, ApiUserInfo } from './types'

const log = logger.child({ module: 'bot-api' })

/** The Telegram cloud — the custom methods only exist on the self-hosted fork. */
const CLOUD_API_ROOT = 'https://api.telegram.org'

interface ApiResponse<T> {
  ok: boolean
  result?: T
  error_code?: number
  description?: string
}

export interface BotApiOptions {
  root: string
  token: string
  /** Injectable for tests. */
  fetchFn?: typeof fetch
}

/**
 * Thin client for the custom Bot API server methods (LyoSU/telegram-bot-api):
 * getMessages (multi-message quotes, reply grafts) and getUserInfo (premium
 * emoji status). Regular bot traffic goes through grammY with the same
 * apiRoot — this client exists only for the methods grammY doesn't type.
 *
 * Against the Telegram cloud the methods don't exist, so every read degrades
 * gracefully (empty/undefined) rather than throwing into handlers — the same
 * contract the old TDLib service honored.
 */
export class BotApiService {
  private readonly root: string
  private readonly token: string
  private readonly fetchFn: typeof fetch
  /** Custom methods are available only on the self-hosted server. */
  private readonly custom: boolean
  /** getUserInfo cache — sender enrichment hits this once per quoted sender. */
  private readonly statusCache = new LruCache<number, { status?: string }>(5_000, 60_000)

  constructor(opts: BotApiOptions) {
    this.root = opts.root
    this.token = opts.token
    this.fetchFn = opts.fetchFn ?? fetch
    this.custom = opts.root !== CLOUD_API_ROOT
  }

  /** Mirrors the old TDLib health check: "can I fetch extra data right now?" */
  isHealthy(): boolean {
    return this.custom
  }

  private async call<T>(method: string, payload: Record<string, unknown>): Promise<T> {
    const res = await this.fetchFn(`${this.root}/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    const body = (await res.json()) as ApiResponse<T>
    if (!body.ok || body.result === undefined) {
      throw new Error(`${method}: ${body.error_code ?? res.status} ${body.description ?? 'malformed response'}`)
    }
    return body.result
  }

  /** Fetch messages by Bot API id; ids the server can't see are skipped. */
  async getMessages(chatId: number, messageIds: number[]): Promise<ApiMessage[]> {
    if (!this.custom || messageIds.length === 0) return []
    try {
      return await this.call<ApiMessage[]>('getMessages', { chat_id: chatId, message_ids: messageIds })
    } catch (err) {
      // "Not found" / nothing fetchable is expected (caller falls back to the
      // single native message). Not actionable → debug, not warn.
      const expected = err instanceof Error && /not found|can't be fetched/i.test(err.message)
      log[expected ? 'debug' : 'warn']({ err, chatId }, 'getMessages failed')
      return []
    }
  }

  /** Premium emoji status (custom_emoji_id) of a user. Best-effort, cached. */
  async getUserEmojiStatus(userId: number): Promise<string | undefined> {
    if (!this.custom) return undefined
    const cached = this.statusCache.get(userId)
    if (cached) return cached.status
    try {
      const info = await this.call<ApiUserInfo>('getUserInfo', { user_id: userId })
      const status = info.emoji_status_custom_emoji_id
      this.statusCache.set(userId, { status })
      return status
    } catch (err) {
      log.debug({ err, userId }, 'getUserInfo failed')
      return undefined
    }
  }
}

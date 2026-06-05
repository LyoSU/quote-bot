# Quote-bot → Custom Bot API Server Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove in-process TDLib (`tdl` + `prebuilt-tdlib`) from quote-bot and use the self-hosted fork (https://tg-api.yuri.ly, LyoSU/telegram-bot-api) as the Bot API root for everything, including the two custom methods `getMessages` / `getUserInfo`.

**Architecture:** grammY gets `client.apiRoot = BOT_API_ROOT` so all regular traffic flows through the self-hosted server. A new thin service `src/services/bot-api/` calls only the two custom methods over plain `fetch` (grammY's typed API doesn't know them) and degrades gracefully against the Telegram cloud — exactly like the old `DISABLE_TDLIB` mode. `src/services/tdlib/` is deleted. Infra: the compose gets a traefik route so `https://tg-api.yuri.ly/file/bot<token>/<path>` serves files cloud-style (rewrite → caddy on the shared volume), making the server a drop-in cloud replacement for quote-api's `getFileLink` and the bot's own file downloads.

**Tech Stack:** TypeScript (strict), grammY 1.x, zod 4, vitest, Coolify API (compose patch), telegraf 3 (quote-api side, one line).

**Context (already deployed, previous plan):** fork branch `custom` with `getMessages`/`getUserInfo`/`--relative`/`--allowed-bot-ids`/`--stats-hide-sensible-data`; Coolify project `botapi`, service `jpaxkqdd3v3rqpj5v7gxxwul`, domains `tg-api.yuri.ly` (API) + `tg-files.yuri.ly` (caddy file-server over `/data`). Test bot `931685018` is in `ALLOWED_BOT_IDS`; local `.env` of quote-bot uses that token.

**Key shapes (verified):**
- `getMessages` response: `{ ok: true, result: Message[] }` — true Bot API `Message` objects (with `reply_to_message`, `forward_origin`, `author_signature`), missing ids silently skipped.
- `getUserInfo` response: Bot API `User` + extra field `emoji_status_custom_emoji_id?: string`.
- `MessageFetcher` in `select.ts` stays as-is (`isHealthy()` + `getMessages()`), only the message type import changes.
- `build-message.ts` already falls back `sender_tag ?? author_signature` and `assemble.ts` handles both `forward_origin` and legacy `forward_from*` — real Bot API messages flow through unchanged.

---

### Task 1: Config — `BOT_API_ROOT`, drop TDLib vars

**Files:**
- Modify: `src/config/env.ts`

- [ ] **Step 1: Replace the TDLib block with `BOT_API_ROOT`**

In `src/config/env.ts`, delete lines 49–56 (the `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` / `DISABLE_TDLIB` block) and add in its place:

```ts
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
```

Also update the stale doc comment at the top of the schema ("(db, redis, quote-api, tdlib, …)" → "(db, quote-api, …)").

- [ ] **Step 2: Typecheck (expected to FAIL)**

Run: `npm run typecheck`
Expected: errors in `src/services/tdlib/client.ts` (uses the removed env keys) — that's the contract for the later deletion task; everything else must be clean. Note the failing files, don't fix them yet.

- [ ] **Step 3: Commit**

```bash
git add src/config/env.ts
git commit -m "feat(config): BOT_API_ROOT replaces the TDLib credential trio"
```

(The repo typechecks red between Tasks 1–5; the suite is green again at the end of Task 5. Acceptable for inline execution; don't push mid-way.)

---

### Task 2: New `src/services/bot-api/` service (TDD)

**Files:**
- Create: `src/services/bot-api/types.ts`
- Create: `src/services/bot-api/service.ts`
- Create: `src/services/bot-api/index.ts`
- Test: `src/services/bot-api/service.test.ts`

The class lives in `service.ts` (no singleton, fetch injectable) so tests don't need the real config; `index.ts` wires the singleton from `config`.

- [ ] **Step 1: Write `types.ts`**

This is a port of `src/services/tdlib/types.ts` with `Td*` → `Api*` renames plus `ApiUserInfo`. Same Bot-API-mirroring shapes, so the quote pipeline (`RawMessage`, `QuoteSource`) keeps matching structurally:

```ts
import type { MessageEntity, PhotoSize } from 'grammy/types'

/**
 * Bot-API-shaped output of the custom server methods.
 *
 * The server returns true Bot API JSON, so these are structural views of the
 * fields the quote pipeline reads — downstream code treats a fetched message
 * exactly like a native update. Where grammY's types match exactly (entities,
 * photo sizes) we reuse them directly.
 */

export interface ApiUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

/** getUserInfo result — Bot API User plus the fork's emoji-status extension. */
export interface ApiUserInfo extends ApiUser {
  /** custom_emoji_id of the user's premium emoji status, if any. */
  emoji_status_custom_emoji_id?: string
}

export type ApiChatType = 'private' | 'group' | 'supergroup' | 'channel'

export interface ApiChatPhoto {
  small_file_id: string
  small_file_unique_id: string
  big_file_id: string
  big_file_unique_id: string
}

export interface ApiChat {
  id: number
  title?: string
  username?: string
  type?: ApiChatType
  first_name?: string
  last_name?: string
  photo?: ApiChatPhoto
}

export interface ApiSticker {
  file_id: string
  is_animated: boolean
  is_video: boolean
  thumbnail?: PhotoSize
}

export interface ApiVoice {
  file_id: string
  waveform?: number[]
  duration: number
}

export interface ApiMediaFile {
  file_id?: string
  file_unique_id?: string
  file_size?: number
  width?: number
  height?: number
  duration?: number
  length?: number
  file_name?: string
  mime_type?: string
  thumbnail?: PhotoSize
}

/** A fetched message. Only populated fields are present. */
export interface ApiMessage {
  message_id: number
  date: number
  text?: string
  caption?: string
  entities?: MessageEntity[]
  caption_entities?: MessageEntity[]

  from?: ApiUser & { is_bot?: boolean }
  sender_chat?: ApiChat
  chat?: ApiChat
  reply_to_message?: ApiMessage

  forward_from?: ApiUser & { is_bot?: boolean }
  forward_from_chat?: ApiChat
  forward_sender_name?: string
  forward_origin?: ApiForwardOrigin
  author_signature?: string
  via_bot?: { username?: string }

  photo?: PhotoSize[]
  sticker?: ApiSticker
  voice?: ApiVoice
  video?: ApiMediaFile
  animation?: ApiMediaFile
  document?: ApiMediaFile
  audio?: ApiMediaFile
  video_note?: ApiMediaFile

  /** "Tap to reveal" media spoiler flag. */
  has_media_spoiler?: boolean
}

export type ApiForwardOriginType = 'user' | 'chat' | 'channel' | 'hidden_user'

export interface ApiForwardOrigin {
  type: ApiForwardOriginType
  date: number
  sender_user?: ApiUser
  sender_chat?: ApiChat
  chat?: ApiChat
  sender_user_name?: string
  author_signature?: string
}
```

- [ ] **Step 2: Write the failing test `service.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'
import { BotApiService } from './service'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function service(fetchFn: typeof fetch, root = 'https://tg-api.example.com'): BotApiService {
  return new BotApiService({ root, token: '42:TEST', fetchFn })
}

describe('BotApiService.getMessages', () => {
  it('POSTs to the custom method and returns the result', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ ok: true, result: [{ message_id: 10, date: 0, text: 'hi' }] }),
    )
    const out = await service(fetchFn).getMessages(-100500, [10, 11])
    expect(out).toEqual([{ message_id: 10, date: 0, text: 'hi' }])
    const [url, init] = fetchFn.mock.calls[0]!
    expect(String(url)).toBe('https://tg-api.example.com/bot42:TEST/getMessages')
    expect(JSON.parse(String(init?.body))).toEqual({ chat_id: -100500, message_ids: [10, 11] })
  })

  it('returns [] on an API error instead of throwing', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ ok: false, error_code: 400, description: 'Bad Request: messages to get not found' }),
    )
    await expect(service(fetchFn).getMessages(1, [1])).resolves.toEqual([])
  })

  it('degrades to [] against the Telegram cloud without calling it', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const svc = service(fetchFn, 'https://api.telegram.org')
    await expect(svc.getMessages(1, [1])).resolves.toEqual([])
    expect(svc.isHealthy()).toBe(false)
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

describe('BotApiService.getUserEmojiStatus', () => {
  it('returns the status and caches the lookup', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ ok: true, result: { id: 1, first_name: 'A', emoji_status_custom_emoji_id: '52313' } }),
    )
    const svc = service(fetchFn)
    await expect(svc.getUserEmojiStatus(1)).resolves.toBe('52313')
    await expect(svc.getUserEmojiStatus(1)).resolves.toBe('52313')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('caches "no status" too', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ ok: true, result: { id: 2, first_name: 'B' } }))
    const svc = service(fetchFn)
    await expect(svc.getUserEmojiStatus(2)).resolves.toBeUndefined()
    await expect(svc.getUserEmojiStatus(2)).resolves.toBeUndefined()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('returns undefined when the call fails', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ ok: false, error_code: 404, description: 'Not Found' }))
    await expect(service(fetchFn).getUserEmojiStatus(1)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/services/bot-api/service.test.ts`
Expected: FAIL — cannot resolve `./service`.

- [ ] **Step 4: Write `service.ts`**

```ts
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
```

- [ ] **Step 5: Write `index.ts` (singleton wiring)**

```ts
import { config } from '../../config/env'
import { BotApiService } from './service'

/** App-wide instance, bound to the configured Bot API root. */
export const botApi = new BotApiService({ root: config.BOT_API_ROOT, token: config.BOT_TOKEN })

export { BotApiService } from './service'
export type { ApiMessage, ApiUser, ApiUserInfo, ApiChat, ApiForwardOrigin } from './types'
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/services/bot-api/service.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add src/services/bot-api
git commit -m "feat(bot-api): thin client for the fork's getMessages/getUserInfo"
```

---

### Task 3: Route grammY and file downloads through `BOT_API_ROOT`

**Files:**
- Modify: `src/core/bot.ts:27`
- Modify: `src/features/fstik/image.ts:24`

- [ ] **Step 1: grammY apiRoot**

In `src/core/bot.ts` replace:

```ts
  const bot = new Bot<BotContext>(config.BOT_TOKEN)
```

with:

```ts
  const bot = new Bot<BotContext>(config.BOT_TOKEN, {
    client: { apiRoot: config.BOT_API_ROOT },
  })
```

- [ ] **Step 2: fstik file URL**

In `src/features/fstik/image.ts` replace:

```ts
  const url = `https://api.telegram.org/file/bot${config.BOT_TOKEN}/${file.file_path}`
```

with:

```ts
  const url = `${config.BOT_API_ROOT}/file/bot${config.BOT_TOKEN}/${file.file_path}`
```

(The self-hosted server serves this exact cloud-shaped path after the infra task below.)

- [ ] **Step 3: Commit**

```bash
git add src/core/bot.ts src/features/fstik/image.ts
git commit -m "feat(core): route grammY and file downloads through BOT_API_ROOT"
```

---

### Task 4: Rewire the quote pipeline off TDLib

**Files:**
- Modify: `src/features/quote/select.ts` (type import + comments)
- Modify: `src/features/quote/select.test.ts:3` (import path)
- Modify: `src/features/quote/index.ts` (lines 6, 95, 157, 164–171)
- Modify: `src/features/quote/assemble.ts:44-47` (stale doc comment)
- Modify: `src/index.ts` (lines 12, 36)
- Modify: `src/core/shutdown.ts:14` (stale comment)

- [ ] **Step 1: `select.ts` — swap the message type**

Replace line 2:

```ts
import type { TdMessage } from '../../services/tdlib'
```

with:

```ts
import type { ApiMessage } from '../../services/bot-api'
```

Then replace every `TdMessage` occurrence with `ApiMessage` (the interface comment, the `getMessages` signature, the two `[] as TdMessage[]` casts). Update the TDLib-era comments: the file's doc comment "fetches the extra ones via TDLib" → "via the Bot API server's getMessages"; "no TDLib→" in the matrix → "no server→"; "graft it from TDLib" → "graft it from a server fetch"; "TDLib down → no block" → "server can't see it → no block"; the `needReply` doc in `SelectParams` "requires a TDLib fetch" → "requires a server-side fetch". Logic stays byte-identical.

- [ ] **Step 2: `select.test.ts` — import path**

Replace line 3:

```ts
import type { TdMessage } from '../../services/tdlib'
```

with:

```ts
import type { ApiMessage } from '../../services/bot-api'
```

and rename the `TdMessage[]` parameter type in the `fetcher()` helper accordingly. No behavioral edits.

- [ ] **Step 3: `features/quote/index.ts` — swap the service**

Replace line 6 import:

```ts
import { botApi } from '../../services/bot-api'
```

Line 95: `fetcher: tdlib,` → `fetcher: botApi,`.

Delete the per-render `statusCache` Map declaration (`const statusCache = new Map<number, string | undefined>()`) — the service's LRU supersedes it — and replace the `getUserEmojiStatus` dep (lines 165–171) with:

```ts
    getUserEmojiStatus: (telegramId) => botApi.getUserEmojiStatus(telegramId),
```

- [ ] **Step 4: `assemble.ts` — stale doc comment**

The `getUserEmojiStatus` dep comment says "TDLib-only data, never present on Bot API User objects". Replace with:

```ts
  /**
   * Premium emoji status (custom_emoji_id) for a user — served by the custom
   * Bot API server's getUserInfo, never present on native updates. Best-effort.
   */
```

- [ ] **Step 5: `src/index.ts` — drop the init**

Remove line 12 (`import { tdlib } from './services/tdlib'`) and line 36 (`tdlib.init() // connects in the background; never blocks startup`).

- [ ] **Step 6: `src/core/shutdown.ts` — comment**

Line 14: `(db, redis, tdlib, http server)` → `(db, http server)`.

- [ ] **Step 7: Run the selector tests**

Run: `npx vitest run src/features/quote/select.test.ts`
Expected: PASS, unchanged test count.

- [ ] **Step 8: Commit**

```bash
git add src/features/quote/select.ts src/features/quote/select.test.ts src/features/quote/index.ts src/features/quote/assemble.ts src/index.ts src/core/shutdown.ts
git commit -m "refactor(quote): fetch extra messages and emoji statuses via bot-api"
```

---

### Task 5: Delete TDLib

**Files:**
- Delete: `src/services/tdlib/` (index.ts, client.ts, normalize.ts, types.ts, normalize.test.ts)
- Delete: `src/types/tdlib-types.d.ts`
- Modify: `package.json` (deps `tdl`, `prebuilt-tdlib`; script `tdlib:types`)
- Modify: `.env` / `.env.example` if present (drop `TELEGRAM_API_ID`/`TELEGRAM_API_HASH`/`DISABLE_TDLIB`, add `BOT_API_ROOT`)

- [ ] **Step 1: Remove the code**

```bash
git rm -r src/services/tdlib src/types/tdlib-types.d.ts
```

(If `src/types/` becomes empty, that's fine — git tracks no empty dirs.)

- [ ] **Step 2: Remove the deps and script**

```bash
npm uninstall tdl prebuilt-tdlib
```

Then delete the `"tdlib:types"` line from `package.json` scripts.

- [ ] **Step 3: Env files**

If `.env` exists locally: remove `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `DISABLE_TDLIB`; add `BOT_API_ROOT=https://tg-api.yuri.ly`. Same (with a placeholder value) for `.env.example` if present.

- [ ] **Step 4: Full gates**

Run: `npm run typecheck`
Expected: clean (this is the moment the Task-1 red goes green).

Run: `npm test`
Expected: all suites pass; `normalize.test.ts` is gone, `service.test.ts` and `select.test.ts` pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat!: drop in-process TDLib — the custom Bot API server replaces it"
```

---

### Task 6: Docs — CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the four stale spots**

1. **Commands**: delete the `tdlib:types` bullet.
2. **Architecture → services**: replace the `tdlib` entry with: `` `bot-api` (thin HTTP client for the self-hosted server's custom methods `getMessages`/`getUserInfo`; degrades gracefully against the Telegram cloud) ``. Update the "What this is" sentence "no Redis, no master/worker sharding, no AI features" stays as-is.
3. **The `/q` pipeline**: "via TDLib for count > 1" → "via the Bot API server for count > 1".
4. **Configuration**: remove `TELEGRAM_API_ID`/`TELEGRAM_API_HASH`, `DISABLE_TDLIB`; add `BOT_API_ROOT`.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: reflect the TDLib → custom Bot API server migration"
```

---

### Task 7: Infra — cloud-shaped `/file/` route on tg-api.yuri.ly

**Files:**
- Modify: `/tmp/botapi-compose-final.yml` (source of truth for the Coolify compose)
- Coolify API: PATCH `docker_compose_raw` of service `jpaxkqdd3v3rqpj5v7gxxwul` + deploy

Files live at `/data/<token>/<relative_path>`; the cloud URL shape is `/file/bot<token>/<relative_path>`. A traefik `replacepathregex` bridges the two, so any client configured with just `apiRoot` works unmodified.

- [ ] **Step 1: Add the route to the `files` service labels**

Append to the `files` service `labels` in the compose (note `$$1` — compose escapes `$`):

```yaml
      - traefik.http.routers.files-api.rule=Host(`tg-api.yuri.ly`) && PathPrefix(`/file/`)
      - traefik.http.routers.files-api.entryPoints=https
      - traefik.http.routers.files-api.tls=true
      - traefik.http.routers.files-api.tls.certresolver=letsencrypt
      - traefik.http.routers.files-api.middlewares=files-strip-botprefix
      - traefik.http.routers.files-api.service=files-custom
      - traefik.http.middlewares.files-strip-botprefix.replacepathregex.regex=^/file/bot(.*)
      - traefik.http.middlewares.files-strip-botprefix.replacepathregex.replacement=/$$1
```

(`Host && PathPrefix` is longer than the API router's bare `Host`, so traefik's default rule-length priority routes `/file/*` here automatically.)

- [ ] **Step 2: Push via the Coolify API**

base64 the compose → PATCH `{"docker_compose_raw": "<b64>"}` to `/api/v1/services/jpaxkqdd3v3rqpj5v7gxxwul`, then GET `/api/v1/deploy?uuid=jpaxkqdd3v3rqpj5v7gxxwul`. Use `curl -o /tmp/...` for every response (rtk truncation).

- [ ] **Step 3: Smoke**

With the test bot token: `getFile` a known `file_id` via `https://tg-api.yuri.ly` → take `file_path` → `curl -fsS -o /tmp/f.bin https://tg-api.yuri.ly/file/bot<token>/<file_path>` → expect 200 and a non-empty file. Also confirm `https://tg-api.yuri.ly/botXXX/getMe` (API router) still answers.

---

### Task 8: quote-api — honor `BOT_API_ROOT`

**Files:**
- Modify: `/Users/ly/dev/quote-api/utils/quote-generate/index.js:41`

- [ ] **Step 1: Pass apiRoot to telegraf's Telegram client**

Replace:

```js
    this.telegram = new Telegram(botToken)
```

with:

```js
    // Self-hosted Bot API server (getFile + file downloads). Without the env
    // the behavior is unchanged (Telegram cloud).
    this.telegram = new Telegram(botToken, process.env.BOT_API_ROOT ? { apiRoot: process.env.BOT_API_ROOT } : undefined)
```

(telegraf 3.40's `getFileLink` builds `${apiRoot}/file/bot${token}/${file_path}` — exactly the route from Task 7.)

- [ ] **Step 2: Commit (quote-api repo)**

```bash
cd /Users/ly/dev/quote-api && git add utils/quote-generate/index.js && git commit -m "feat: optional BOT_API_ROOT for a self-hosted Bot API server"
```

Deployment note: the env var on the quote-api Coolify app (`ncgg4gwwcw884owsss448kcw`) is set during the prod migration (runbook), **before** the prod bot logs out of the cloud.

---

### Task 9: Live smoke — local bot against tg-api.yuri.ly

No file changes; interactive verification with the test bot (`931685018`, already in `ALLOWED_BOT_IDS`).

- [ ] **Step 1: Point the local bot at the server**

Ensure `.env` has `BOT_API_ROOT=https://tg-api.yuri.ly`, then `npm run dev`. Expected log: bot authorizes (getMe via the server).

- [ ] **Step 2: If polling gets no updates**

The cloud may still hold the getUpdates session. Run `curl -fsS -o /tmp/logout.json https://api.telegram.org/bot<TEST_TOKEN>/logOut`, restart dev, retry.

- [ ] **Step 3: Functional checks (ask the user to drive in the test group)**

- `/q` on a reply → sticker arrives (full grammY round-trip through the server)
- `/q 3` → multi-message quote (custom `getMessages`)
- `/q r` on a message that replies to another → reply block (reply graft)
- quote of a premium user with emoji status → status emoji next to the name (custom `getUserInfo`)
- quote with a photo → media renders (quote-api still on cloud at this point: needs `BOT_API_ROOT` locally for quote-api too if testing against a local quote-api; against prod quote-api the file_id resolves via cloud only until the prod migration — expected)

---

### Task 10: Prod migration runbook (document only — executed when the rewrite ships)

**Files:**
- Create: `docs/runbooks/bot-api-migration.md`

- [ ] **Step 1: Write the runbook**

```markdown
# Switching the production bot to the self-hosted Bot API server

Pre-req: the grammY rewrite is what's being deployed (the legacy bot never
supported BOT_API_ROOT). Order matters — file URLs must work before logOut.

1. **Allow the prod bot on the server.** Coolify → project `botapi` → service
   env `ALLOWED_BOT_IDS`: append `,<prod_bot_id>`. Redeploy the service.
2. **quote-api first.** Coolify app `quote-api`: set
   `BOT_API_ROOT=https://tg-api.yuri.ly`, redeploy. Verify a quote with media
   still renders (file_ids issued by the cloud stay resolvable on the server
   only AFTER the bot moves — at this step quote-api can still reach the cloud
   for old ids; new ids will come from the server).
3. **Log out of the cloud.**
   `curl https://api.telegram.org/bot<PROD_TOKEN>/logOut`
   (One-shot; afterwards the cloud rejects the token for ~serving purposes and
   the local server owns the bot.)
4. **Switch the bot.** Prod quote-bot env: set
   `BOT_API_ROOT=https://tg-api.yuri.ly`, remove `TELEGRAM_API_ID`,
   `TELEGRAM_API_HASH`, `DISABLE_TDLIB`. Deploy.
5. **Monitor.** `/metrics` + logs; functional: `/q`, `/q 3`, `/q r`, emoji
   status, photo quote, fstik. Server side: `https://tg-api.yuri.ly:…` stats
   endpoint is internal-only; check Coolify container logs.

## Rollback

1. Unset `BOT_API_ROOT` on the bot, redeploy — grammY goes back to the cloud.
2. On the server: `curl -X POST https://tg-api.yuri.ly/bot<PROD_TOKEN>/close`
   (frees the token server-side).
3. The cloud accepts the token again after up to ~10 minutes. File ids issued
   by the local server (sticker uploads) remain valid — file ids are global.
4. quote-api: unset `BOT_API_ROOT`, redeploy.
```

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/bot-api-migration.md
git commit -m "docs: prod runbook for the Bot API server switch"
```

---

## Self-review notes

- Spec coverage: BOT_API_ROOT + apiRoot (T1/T3), thin MessageFetcher service with LRU (T2), rewire + delete tdlib + deps + env (T4/T5), quote-api file URL before logOut (T7/T8/runbook order), migration sequence + rollback (T10). ✓
- `MessageFetcher` signature change is type-only; `select.ts` logic untouched — the graceful-degradation tests in `select.test.ts` keep passing against `isHealthy() === false`. ✓
- Type names consistent across tasks: `ApiMessage`/`ApiUserInfo`/`BotApiService`/`botApi`/`getUserEmojiStatus`. ✓
- Typecheck is intentionally red between T1 and T5 (the doomed `tdlib/client.ts` reads deleted env keys); documented in T1. ✓

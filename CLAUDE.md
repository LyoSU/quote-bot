# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Telegram quote-sticker bot. As of v2 it is a **from-scratch rewrite** in **TypeScript + grammY** (the legacy Telegraf 3 cluster bot was removed). One long-polling process; no Redis, no master/worker sharding, no AI features.

## Commands

- **Dev**: `npm run dev` (tsx watch on `src/index.ts`)
- **Build**: `npm run build` (tsc → `dist/`, then copies `src/i18n/locales` → `dist/i18n/locales`)
- **Run (prod)**: `npm start` (`node dist/index.js`)
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`) — this is the quality gate (strict, no `any`)
- **Test**: `npm test` (vitest); `npm run test:watch`

There is no ESLint setup for the TS code; `tsc --strict` is the gate.

## Architecture

Single process. `src/index.ts` is the composition root (the only file that wires concrete pieces): config → DB → bot core → context + features → polling → health.

Update flow: `fastPath` (drops ~95% group noise before any DB) → `sequentialize` (per-chat ordering, by chat id) → logger/timing → `contextMiddleware` (resolves `ctx.user`/`ctx.group`) → `i18nMiddleware` (Fluent locale negotiation) → `features`.

### Layers (never import "upward")

- `src/config/env.ts` — zod-validated, frozen config; fail-fast on bad env.
- `src/core/` — `bot` (auto-retry + network-retry + fast-path + sequentialize + error boundary; deliberately NO send throttler — see the comment in `bot.ts`), `runner` (long polling, allowed_updates, per-update sink timeout), `poll-watch` (polling freshness + stall watchdog), `logger` (pino), `metrics` (prom-client), `shutdown`, `lru`, `types` (`BotContext`).
- `src/db/` — Mongoose models (schema kept **1:1 with production**), `repositories/` (atomic `updateOne`/`findOneAndUpdate`, never full-doc `.save()`; user/group lookups are LRU-cached with delete-on-write — route ALL User/Group writes through the repositories), `member-tracker`, dedicated `connection`.
- `src/services/` — `bot-api` (thin HTTP client for the self-hosted Bot API server's custom methods `getMessages`/`getUserInfo`; degrades gracefully against the Telegram cloud), `quote-api` (HTTP client for the renderer), `sticker`, `stats`, `gab`, `gramads`.
- `src/middlewares/` — `fast-path`, `context`, `guards` (`onlyGroup`/`onlyAdmin`).
- `src/features/` — `quote` (the core pipeline + `/q_<id>`, rate, random, top), `settings`, `shell` (start/help/menu/app/lang), `payments` (Telegram Stars), `inline`, `fstik`, `ping`. Aggregated in `src/features/index.ts` (order matters: specific handlers before the quote private-chat catch-all).
- `src/i18n/` — `@grammyjs/i18n` (Fluent), 19 locales in `locales/*.ftl`.
- `src/health/` — health + `/metrics` HTTP endpoint.

### The `/q` pipeline (`src/features/quote/`)

`index.ts` orchestrates: `parse-args` → resolve render options (`render`, `color`) → select source messages (`select`, via the Bot API server for count > 1) → `assemble` (sender resolution, streaks, forward labels, privacy) → `build-message` (pure per-message → renderer shape) → `quote-api` render → `send` (sticker direct / photo / document / guest) → `persist` (off the hot path: Counter `global_id`, per-group `local_id`, `denormalize`, rating votes). Modules are small and pure where possible; randomness/time are injected for testing.

### Auto-gab (`src/services/gab` + `features/quote/random.ts`)

Occasionally resurfaces a top quote on a lively group moment, biased to a quote **authored by someone currently speaking** ("throwback"). The hot-path check is O(1) (in-memory activity LRU + probability + 60s cooldown + ≥2 active speakers); the real work (one indexed `$sample`) runs at most once per cooldown per group. Speaker activity is recorded on the fast-path noise branch — no per-message DB.

## Commands the bot exposes (syntax kept 1:1 with the legacy bot)

`/q [flags]` (r/reply, p/png, i/img, rate, h/hidden, m/media, c/crop, s/stories, `s<n>` scale, `<int>` count, color), `/q_<id>`, rate/irate buttons, `/qrand`, `/qtop`, `/qcolor`, `/qb`, `/qemoji`, `/hidden`, `/privacy`, `/qrate`, `/qgab`, `/qarchive`, `/qforget`, `/start`, `/help`, `/app`, `/lang`, `/donate`, `/refund` (owner-only), `/qs`. Guest mode via `guest_message`.

## Configuration (env, validated in `src/config/env.ts`)

`BOT_TOKEN`, `MONGODB_URI` (required), `QUOTE_API_URI` (required), `MONGO_MAX_POOL`, `STATS_FLUSH_MS`, `MINI_APP_SHORT_NAME`, `MINI_APP_URL`, `BOT_API_ROOT` (self-hosted Bot API server; cloud by default), `HEALTH_PORT`, `BOT_CONCURRENCY`, `GRAMADS_TOKEN`, `ADMIN_ID`, `LOG_LEVEL`, `NODE_ENV`.

## Conventions

- Strict TypeScript, no `any`. Boundary casts on Telegram data (`as RawMessage`) are acceptable; casts hiding real mismatches are not.
- Atomic DB writes only (no full-doc `.save()` → avoids VersionError).
- Don't reintroduce dropped pieces: Redis, cluster/worker sharding, the in-house ad system, AI features, HTML render mode, Stripe/Freekassa, the Bottleneck send throttler (`@grammyjs/transformer-throttler` — its unbounded silent queues froze the bot; 429s are auto-retry's job). Ads = gramads only (ru-locale + private chat). Payments = Telegram Stars (XTR) only.
- New work: handlers in `src/features/`, services in `src/services/`, models in `src/db/models/`. Keep modules small and testable.

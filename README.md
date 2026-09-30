# QuotLy Bot 💬✨

A Telegram bot that turns chat messages into beautiful quote stickers.

[![time tracker](https://wakatime.com/badge/github/LyoSU/quote-bot.svg)](https://wakatime.com/badge/github/LyoSU/quote-bot)

v2 is a from-scratch rewrite in **TypeScript + [grammY](https://grammy.dev)**: one long-polling process, strict types, no cluster sharding, no Redis.

## Features 🚀

- **Quote stickers** — WebP stickers, PNG/image, or document output
- **Multi-message quotes** — `/q 3` grabs a range via a self-hosted Bot API server
- **Customizable** — background colors, emoji brands, scaling, crop, media
- **Privacy** — per-user and per-group anonymization
- **Ratings** — rate buttons, `/qtop`, `/qrand`, auto-gab throwbacks
- **Guest Mode** (Bot API 10.0+) — mention the bot in any chat *without adding it as a member*: reply to a message + `@quotlybot` and a quote sticker lands right in the chat
- **Inline mode, Mini App, Telegram Stars payments**

## Installation 📦

### Prerequisites

- Node.js 22+
- MongoDB
- [quote-api](https://github.com/LyoSU/quote-api) (the image renderer)
- Optional: a self-hosted [Bot API server](https://github.com/LyoSU/telegram-bot-api) for multi-message quotes and premium emoji statuses

### Quick start

```bash
git clone https://github.com/LyoSU/quote-bot.git
cd quote-bot
npm install
cp .env.example .env   # fill in BOT_TOKEN, MONGODB_URI, QUOTE_API_URI
npm run dev            # tsx watch
```

Production:

```bash
npm run build
npm start
```

### Docker 🐳

```bash
docker build -t quote-bot .
docker run --env-file .env quote-bot
```

## Configuration ⚙️

Validated on startup by `src/config/env.ts` — the process exits with a readable report if anything is missing.

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_TOKEN` | Bot token from @BotFather | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `QUOTE_API_URI` | quote-api endpoint | Yes |
| `BOT_API_ROOT` | Self-hosted Bot API server root (Telegram cloud by default) | No |
| `HEALTH_PORT` | Health + Prometheus `/metrics` port (default 3000) | No |
| `BOT_CONCURRENCY` | Max concurrent updates across chats (default 500) | No |
| `GRAMADS_TOKEN` | gramads ads (ru-locale PMs only) | No |
| `ADMIN_ID` | Owner id for privileged commands (`/refund`) | No |

See `.env.example` for the full list.

## Usage 📖

### Basic commands

- `/q` — quote the replied message
- `/q <number>` — quote a range of messages (needs `BOT_API_ROOT`)
- `/q_<id>` — recall a saved quote
- `/qrand` — random top quote
- `/qtop` — top-rated quotes
- `/qfind` — search this group's saved quote stickers
- `/help` — help

### Inline sticker search

- `@quotlybot` — browse stickers you have up-voted.
- `@quotlybot words` — filter your liked stickers by archived text or author name/username.
- `/qtop` opens `@quotlybot top:<groupId>`; append words to filter that group's top stickers.
- `/qfind` sends a single **Click To Search** button that opens `@quotlybot find:<groupId>`; type words to search all saved stickers in that group, including unrated ones.

All three lists keep their rating-score ordering. Ordinary inline queries have
no group id; `/qtop` and `/qfind` carry it explicitly in the query prefix.

Matching is case-insensitive and accepts partial words. Every query word must
appear somewhere in the sticker's text, reply text, or archived author fields.
Quotes without archived matching data and forgotten quotes do not appear in
word searches; an empty query still browses the existing sticker list.

Search uses the existing group/vote indexes to restrict candidates, projects
only sticker/rating fields, and caps Mongo query execution at 1.5 seconds. No
new index or backfill is required. Regex matching scans the selected list, so
very large liked/group lists need latency checks on production data before
extending this to a global search.

Optional real-Mongo validation (use an isolated test server; the suite creates
and drops its own temporary database):

```bash
INLINE_SEARCH_TEST_MONGO_URI=mongodb://127.0.0.1:27017 npm test -- src/features/inline/search.integration.test.ts
```

### Quote flags

- `/q p` — PNG image · `/q i` — image file
- `/q r` — include the reply context block
- `/q rate` — attach rating buttons
- `/q <color>` — background color
- `/q s1.5` — scale factor · `/q c` — crop · `/q m` — keep media

### Settings

- `/qcolor <color>` — default background
- `/qemoji` — emoji brand
- `/qrate` — rating system on/off
- `/qgab` — auto-gab frequency
- `/privacy`, `/hidden` — privacy toggles
- `/lang` — language (19 locales)

## Architecture 🏗️

Single process; `src/index.ts` is the composition root.

Update flow: fast-path noise filter → per-chat sequentialize → context →
i18n (Fluent) → features. Outgoing calls go through a throttler + auto-retry.

```
src/
├── config/        # zod-validated env
├── core/          # bot stack, runner, logger, metrics, shutdown
├── db/            # Mongoose models + atomic repositories
├── services/      # bot-api, quote-api, sticker, stats, gab, gramads
├── middlewares/   # fast-path, context, guards
├── features/      # quote, settings, shell, payments, inline, fstik
├── i18n/          # Fluent locales
└── health/        # health + /metrics endpoint
```

## Development 👨‍💻

```bash
npm run dev        # watch mode
npm run typecheck  # tsc --strict — the quality gate
npm test           # vitest
```

## License 📄

MIT — see [LICENSE](LICENSE).

## Acknowledgments 🙏

- [grammY](https://grammy.dev/) — the Telegram bot framework
- [telegram-bot-api](https://github.com/tdlib/telegram-bot-api) — the Bot API server ([our fork](https://github.com/LyoSU/telegram-bot-api) adds the custom methods)

---

Made with ❤️ by [LyoSU](https://github.com/LyoSU)

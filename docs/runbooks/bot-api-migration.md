# Switching the production bot to the self-hosted Bot API server

Pre-req: the grammY rewrite is what's being deployed (the legacy bot never
supported `BOT_API_ROOT`). Order matters — file URLs must work before logOut.

Server facts: Coolify project `botapi`, service `jpaxkqdd3v3rqpj5v7gxxwul`,
API domain `https://tg-api.yuri.ly` (serves cloud-shaped `/file/bot<token>/…`
via a traefik stripprefix → caddy on the shared volume), raw files domain
`https://tg-files.yuri.ly/<token>/…`.

1. **Allow the prod bot on the server.** Coolify → project `botapi` → service
   env `ALLOWED_BOT_IDS`: append `,<prod_bot_id>`. Redeploy the service.
   (Test bot `931685018` is already listed.)
2. **quote-api first.** Coolify app `quote-api`: set
   `BOT_API_ROOT=https://tg-api.yuri.ly`, redeploy. Behavior is unchanged for
   cloud-issued file_ids until the bot moves; new ids will come from the
   server and resolve through the same root.
3. **Log out of the cloud.**
   `curl https://api.telegram.org/bot<PROD_TOKEN>/logOut`
   One-shot; afterwards the local server owns the bot.
4. **Switch the bot.** Prod quote-bot env: set
   `BOT_API_ROOT=https://tg-api.yuri.ly`; remove `TELEGRAM_API_ID`,
   `TELEGRAM_API_HASH`, `DISABLE_TDLIB`. Deploy.
5. **Monitor.** `/metrics` + logs. Functional: `/q`, `/q 3` (custom
   getMessages), `/q r` (reply graft), premium emoji status next to a sender
   name (custom getUserInfo), photo quote (file route), fstik image import.

## Rollback

1. Unset `BOT_API_ROOT` on the bot, redeploy — grammY goes back to the cloud.
2. Free the token server-side:
   `curl -X POST https://tg-api.yuri.ly/bot<PROD_TOKEN>/close`
3. The cloud accepts the token again (allow up to ~10 minutes). File ids are
   global, so stickers uploaded through the local server stay valid.
4. quote-api: unset `BOT_API_ROOT`, redeploy.

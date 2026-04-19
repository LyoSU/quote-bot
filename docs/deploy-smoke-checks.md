# Deep-link smoke checklist

Run these after redeploying the bot + webapp. Each step lists what to do, what to see, and where to look in the logs if it breaks.

## Prereqs

- Bot redeployed with commits on `master` including `864543c` and `d0e1e…` (ctx.botInfo middleware + deep-link buttons).
- Webapp redeployed.
- You have a test group where the bot is present and can post.
- Backfill ran: `node scripts/backfill-group-members.js` then `node scripts/fix-duplicate-local-ids.js --apply`.

## Checks

### 1. `/q` in a group → ✨ Open quote button

- Reply to a message with `/q`.
- **Expected:** sticker with 👍/👎 row, then a second row `✨ Відкрити цитату`.
- Tap the button → webapp opens on `/g/<id>/q/<local_id>`, shows the quote.
- **If missing:** check bot logs for `[quote] editMessageReplyMarkup failed` — the description field tells you why (e.g. `MESSAGE_NOT_MODIFIED`, `Bad Request: message can't be edited`).

### 2. `/q` in PM with a forwarded message

- Forward a group message to the bot in PM, send `/q`.
- **Expected:** sticker + 👍/👎 (if rate enabled for your PM "group") + `✨ Відкрити цитату`.
- Tap → webapp opens the quote in your personal group.

### 3. `/qrand` in a group

- `/qrand`.
- **Expected:** random document with 👍/👎 and `✨ Відкрити цитату` when the picked quote has a `local_id`.
- Old quotes without `local_id`: button omitted, rate buttons still render.

### 4. `/q_<id>` get-by-id

- `/q_<objectId>` in any chat where the bot can post.
- **Expected:** document + rate row + `✨ Відкрити цитату` (when local_id exists).

### 5. `/qtop` in a group

- `/qtop`.
- **Expected:** HTML message with two rows: `Переглянути найкращі цитати` (inline query) and `📚 Усі цитати групи` (url).

### 6. `/app` in a group

- `/app`.
- **Expected:** HTML message with single `📚 Усі цитати групи` button → webapp group feed.

### 7. `/app` in PM

- `/app`.
- **Expected:** HTML message with `💫 Мої групи` → webapp groups list.

### 8. `/start` → main menu in PM

- `/start` (returning user) or fresh `/start` after onboarding.
- **Expected:** top row is `💫 Мої групи` URL, rest of menu below.

### 9. Webapp 403 UX

- Open a deep link to a quote in a group you're not part of:
  `https://t.me/<bot>/app?startapp=q_1_g_<some-other-group-id>`
- **Expected:** webapp lands on the quote route then shows the "Ця група закрита 🔒" screen with `До моїх груп` button.

### 10. Webapp 401 (session expired) UX

- Keep the webapp open >1h or manually tamper with initData.
- Trigger any API call (scroll a group, open a quote).
- **Expected:** "Сесія прострочилась ⏳" screen with `Закрити додаток` button.

## Diagnostic queries

```bash
# Bot logs — deep-link edit failures
grep "editMessageReplyMarkup failed\|\[app\] could not resolve" <coolify-log>

# Bot logs — session save failures after ctx.session.userInfo.save warns
grep "\[session\]" <coolify-log>

# Mongo — any duplicate local_id remaining
db.quotes.aggregate([
  { $match: { local_id: { $ne: null } } },
  { $group: { _id: { group: "$group", lid: "$local_id" }, n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } },
  { $count: "dupGroups" }
])
```

## Known limitations

- `editMessageReplyMarkup` doesn't pass `business_connection_id`, so `/q` in a business chat sends the sticker with rate buttons but no app button. Expected warn log, not a bug.
- `getUserProfilePhotos` returns empty for users with restrictive privacy — avatar falls back to `t.me/i/userpic/320/<username>.jpg` when username is known, else gradient initials.

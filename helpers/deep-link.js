// Telegram Mini App deep links: https://core.telegram.org/bots/webapps#direct-link-mini-apps
// Format: https://t.me/<bot_username>/<short_name>?startapp=<payload>
// Payload accepts [A-Za-z0-9_-]{0,64} and arrives in the webapp as
// `Telegram.WebApp.initDataUnsafe.start_param`. The webapp parses it in
// quotly-webapp/src/lib/telegram/verify-init-data.ts:parseStartParam.

function shortName () {
  return process.env.MINI_APP_SHORT_NAME || 'app'
}

function baseUrl (botUsername) {
  if (process.env.MINI_APP_URL) return process.env.MINI_APP_URL
  if (!botUsername) throw new Error('deep-link: botUsername required when MINI_APP_URL is not set')
  return `https://t.me/${botUsername}/${shortName()}`
}

function build (botUsername, startParam) {
  const base = baseUrl(botUsername)
  return startParam ? `${base}?startapp=${startParam}` : base
}

function forRoot (botUsername) {
  return build(botUsername)
}

function forGroup (botUsername, groupObjectId) {
  if (!groupObjectId) return build(botUsername)
  return build(botUsername, `g_${groupObjectId}`)
}

function forQuote (botUsername, groupObjectId, localId) {
  if (!groupObjectId || localId == null) return build(botUsername)
  return build(botUsername, `q_${localId}_g_${groupObjectId}`)
}

module.exports = { forRoot, forGroup, forQuote }

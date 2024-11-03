const fs = require('fs')
const { Bot, session } = require('grammy')
const { db } = require('./database')
const { stats } = require('./middlewares')
const { I18n } = require('@grammyjs/i18n')
const path = require('path')
const composer = require('./handler')

// Add MemorySessionStorage class
class MemorySessionStorage {
  constructor() {
    this.sessions = new Map()
  }

  async read(key) {
    return this.sessions.get(key) ?? null
  }

  async write(key, value) {
    this.sessions.set(key, value)
  }

  async delete(key) {
    this.sessions.delete(key)
  }
}

async function setupWorker(botToken) {
  console.log(`Worker ${process.pid} started`)

  let botInstance = null
  let botInitialized = false

  // Wait for bot info from master
  await new Promise((resolve) => {
    process.once('message', async (msg) => {
      if (msg.type === 'BOT_INFO') {
        botInstance = new Bot(botToken, {
          client: {
            canUseWebhookReply: false,
          },
          botInfo: msg.botInfo,
        })

        // 1. Add error handler first
        botInstance.catch((err) => {
          console.error('Error in bot middleware:', err)
        })

        // 2. Initialize state and session first
        botInstance.use((ctx, next) => {
          ctx.state = {}
          ctx.state.emptyRequest = false

          // Ensure session exists with default values
          if (!ctx.session) {
            ctx.session = {
              locale: 'en',
              userInfo: {},
              group: {},
              __language_code: 'en'
            }
          }
          return next()
        })

        // Add this before other middleware
        botInstance.use(async (ctx, next) => {
          if (!ctx.session) {
            console.log('No session found')
            ctx.session = {
              locale: 'en',
              userInfo: {},
              group: {},
              __language_code: 'en'
            }
          }

          if (!ctx.session.locale) {
            console.log('No locale in session, setting default')
            ctx.session.locale = 'en'
          }

          console.log('Session before i18n:', {
            locale: ctx.session.locale,
            hasSession: !!ctx.session
          })

          await next()
        })

        // 3. Add session middleware
        botInstance.use(session({
          initial: () => ({
            locale: 'en',
            userInfo: {},
            group: {},
            __language_code: 'en'
          }),
          getSessionKey: (ctx) => {
            if (!ctx.from?.id) return undefined
            return ctx.chat?.type === 'private'
              ? `user:${ctx.from.id}`
              : `${ctx.from.id}:${ctx.chat?.id}`
          },
          storage: new MemorySessionStorage()
        }))

        const i18n = new I18n({
          defaultLocale: 'en',
          directory: path.resolve(__dirname, 'locales'),
          useSession: true,
          sessionLocaleKey: 'locale',
          fluentBundles: {
            'en': ['en'],
            'uk': ['uk', 'en']  // Fallback to English
          },
          localeNegotiator: (ctx) => {
            return ctx.session?.locale || ctx.from?.language_code || 'en'
          }
        })

        // Initialize session and i18n
        botInstance.use(session({
          initial: () => ({
            locale: 'en',
            userInfo: {},
            group: {},
            __language_code: 'en'
          }),
          getSessionKey: (ctx) => {
            if (!ctx.from?.id) return undefined
            return ctx.chat?.type === 'private'
              ? `user:${ctx.from.id}`
              : `${ctx.from.id}:${ctx.chat?.id}`
          },
          storage: new MemorySessionStorage()
        }))

        // Add i18n middleware
        botInstance.use(i18n)

        // Debug logging to check loaded translations
        botInstance.use(async (ctx, next) => {
          // Ensure session and locale are set
          if (!ctx.session) {
            ctx.session = {
              locale: ctx.from?.language_code || 'en',
              userInfo: {},
              group: {},
              __language_code: ctx.from?.language_code || 'en'
            }
          }

          // Log i18n state
          console.log('I18n state:', {
            sessionLocale: ctx.session?.locale,
            fromLanguage: ctx.from?.language_code,
            availableLocales: Object.keys(i18n.locales || {})
          })

          return next()
        })

        // Add i18n middleware with error handling
        botInstance.use(async (ctx, next) => {
          try {
            await i18n.middleware()(ctx, next)
          } catch (err) {
            console.error('Error in i18n middleware:', err)
            // Ensure session has a locale even if i18n fails
            ctx.session.locale = ctx.session?.locale || 'en'
            return next()
          }
        })

        // Add remaining middleware
        botInstance.use(async (ctx, next) => {
          const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
          ctx.config = config
          ctx.db = db
          ctx.tdlib = tdlibProxy
          return next()
        })

        botInstance.use(stats.middleware())
        botInstance.use(composer)

        botInitialized = true
        resolve()
      }
    })
  })

  const tdlibProxy = new Proxy({}, {
    get (target, prop) {
      return (...args) => {
        return new Promise((resolve, reject) => {
          const id = Date.now() + Math.random()
          process.send({ type: 'TDLIB_REQUEST', method: prop, args, id })

          const handler = (msg) => {
            if (msg.type === 'TDLIB_RESPONSE' && msg.id === id) {
              process.removeListener('message', handler)
              if (msg.error) {
                reject(new Error(msg.error))
              } else {
                resolve(msg.result)
              }
            }
          }

          process.on('message', handler)
        })
      }
    }
  })

  // Handle messages after bot is initialized
  process.on('message', async (msg) => {
    if (msg.type === 'HEALTH_CHECK') {
      process.send({ type: 'HEALTH_RESPONSE' })
    }

    if (msg.type === 'UPDATE' && botInitialized) {
      try {
        await botInstance.handleUpdate(msg.payload)
      } catch (error) {
        console.error('Error processing update in worker:', error)
      } finally {
        process.send({ type: 'TASK_COMPLETED' })
      }
    }
  })
}

module.exports = { setupWorker }

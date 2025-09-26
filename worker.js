const fs = require('fs')
const { Telegraf } = require('telegraf')
const { db } = require('./database')
const { stats } = require('./middlewares')

function setupWorker (botToken, handlerTimeout) {
  console.log(`Worker ${process.pid} started`)

  const tdlibProxy = new Proxy({}, {
    get (target, prop) {
      return (...args) => {
        return new Promise((resolve, reject) => {
          const id = Date.now() + Math.random()
          process.send({ type: 'TDLIB_REQUEST', method: prop, args, id })

          const handler = (msg) => {
            if (msg.type === 'TDLIB_RESPONSE' && msg.id === id) {
              clearTimeout(timeout)
              process.removeListener('message', handler)
              if (msg.error) {
                reject(new Error(msg.error))
              } else {
                resolve(msg.result)
              }
            }
          }

          const timeout = setTimeout(() => {
            process.removeListener('message', handler)
            reject(new Error(`TDLib request timeout for method: ${prop}`))
          }, 5000) // 5 second timeout for faster recovery

          process.on('message', handler)
        })
      }
    }
  })

  const bot = new Telegraf(botToken, { handlerTimeout })

  // Cache config to avoid blocking file reads - optimized
  let configCache = null
  let configLastModified = 0
  let configPromise = null

  const getConfig = () => {
    // Return cached config synchronously if available
    if (configCache) {
      // Async refresh check without blocking
      setImmediate(async () => {
        try {
          const stats = await fs.promises.stat('./config.json').catch(() => null)
          if (stats && stats.mtimeMs > configLastModified) {
            const configData = await fs.promises.readFile('./config.json', 'utf8')
            configCache = JSON.parse(configData)
            configLastModified = stats.mtimeMs
          }
        } catch (error) {
          console.warn('Background config refresh failed:', error.message)
        }
      })
      return configCache
    }

    // Only load synchronously on first request
    if (!configPromise) {
      configPromise = (async () => {
        try {
          const configData = await fs.promises.readFile('./config.json', 'utf8')
          configCache = JSON.parse(configData)
          configLastModified = Date.now()
        } catch (error) {
          console.warn('Initial config load failed, using defaults:', error.message)
          configCache = {}
        }
        configPromise = null
        return configCache
      })()
    }

    return configCache || {}
  }

  bot.use(async (ctx, next) => {
    ctx.config = getConfig()
    ctx.db = db
    ctx.tdlib = tdlibProxy
    return next()
  })

  bot.use(stats.middleware())

  const handler = require('./handler')
  bot.use(handler)

  process.on('message', async (msg) => {
    if (msg.type === 'HEALTH_CHECK') {
      process.send({ type: 'HEALTH_RESPONSE' })
    }

    if (msg.type === 'UPDATE') {
      try {
        if (typeof bot.handleUpdate !== 'function') {
          throw new Error('bot.handleUpdate is not a function')
        }
        await bot.handleUpdate(msg.payload)
      } catch (error) {
        console.error('Error processing update in worker:', error)
      } finally {
        process.send({ type: 'TASK_COMPLETED' })
      }
    }
  })
}

module.exports = { setupWorker }

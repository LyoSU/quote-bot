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
          }, 10000) // 10 second timeout (shorter than master)

          process.on('message', handler)
        })
      }
    }
  })

  const bot = new Telegraf(botToken, { handlerTimeout })

  // Cache config to avoid blocking file reads
  let configCache = null
  let configLastModified = 0

  const getConfig = () => {
    try {
      const stats = fs.statSync('./config.json')
      if (!configCache || stats.mtimeMs > configLastModified) {
        configCache = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
        configLastModified = stats.mtimeMs
      }
      return configCache
    } catch (error) {
      console.error('Error reading config:', error)
      return configCache || {}
    }
  }

  bot.use((ctx, next) => {
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

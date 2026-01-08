const Redis = require('ioredis')

function createRedisClient (options = {}) {
  const redisUrl = process.env.REDIS_URL

  if (redisUrl) {
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      ...options
    })
  }

  return new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    ...options
  })
}

module.exports = { createRedisClient }

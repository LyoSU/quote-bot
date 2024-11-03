const rateLimit = (options) => {
  const limits = new Map()
  return async (ctx, next) => {
    const key = options.keyGenerator(ctx)
    const now = Date.now()
    const windowStart = Math.floor(now / options.window) * options.window

    const current = limits.get(key) || { count: 0, window: windowStart }
    if (current.window < windowStart) {
      current.count = 0
      current.window = windowStart
    }

    if (current.count >= options.limit) {
      if (options.onLimitExceeded) {
        return options.onLimitExceeded(ctx, next)
      }
      return
    }

    current.count++
    limits.set(key, current)
    return next()
  }
}

module.exports = { rateLimit }

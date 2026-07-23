import { describe, it, expect } from 'vitest'
import { EnvSchema } from './env'

describe('EnvSchema', () => {
  const valid = { BOT_TOKEN: 'x', MONGODB_URI: 'mongodb://localhost/db', QUOTE_API_URI: 'http://api' }

  it('applies sane defaults', () => {
    const parsed = EnvSchema.parse(valid)
    expect(parsed.NODE_ENV).toBe('development')
    expect(parsed.LOG_LEVEL).toBe('info')
    expect(parsed.HEALTH_PORT).toBe(3000)
    expect(parsed.BOT_CONCURRENCY).toBe(500)
    expect(parsed.MONGO_MAX_POOL).toBe(50)
  })

  it('rejects a missing BOT_TOKEN', () => {
    expect(EnvSchema.safeParse({ MONGODB_URI: 'mongodb://localhost/db' }).success).toBe(false)
  })

  it('rejects a missing MONGODB_URI', () => {
    expect(EnvSchema.safeParse({ BOT_TOKEN: 'x' }).success).toBe(false)
  })

  it('rejects an unknown LOG_LEVEL', () => {
    expect(EnvSchema.safeParse({ ...valid, LOG_LEVEL: 'loud' }).success).toBe(false)
  })

  it('coerces numeric strings for ports/concurrency', () => {
    const parsed = EnvSchema.parse({ ...valid, HEALTH_PORT: '8080', BOT_CONCURRENCY: '12' })
    expect(parsed.HEALTH_PORT).toBe(8080)
    expect(parsed.BOT_CONCURRENCY).toBe(12)
  })
})

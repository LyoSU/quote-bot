import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Provide the minimum env so importing modules that depend on the validated
    // config (which fails-fast on a missing BOT_TOKEN) is safe inside tests.
    env: {
      NODE_ENV: 'test',
      BOT_TOKEN: 'test:token',
      MONGODB_URI: 'mongodb://localhost:27017/quote-bot-test',
      QUOTE_API_URI: 'http://quote-api.test',
    },
    include: ['src/**/*.test.ts'],
  },
})

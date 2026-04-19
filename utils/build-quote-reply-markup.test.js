const test = require('node:test')
const assert = require('node:assert/strict')
const buildQuoteReplyMarkup = require('./build-quote-reply-markup')

test('returns {} when neither rate nor deep-link', () => {
  const result = buildQuoteReplyMarkup({})
  assert.deepEqual(result, {})
})

test('returns rate-only keyboard when rateEnabled and no deep-link', () => {
  const result = buildQuoteReplyMarkup({ rateEnabled: true })
  assert.equal(result.reply_markup.inline_keyboard.length, 1)
  assert.equal(result.reply_markup.inline_keyboard[0].length, 2)
  assert.equal(result.reply_markup.inline_keyboard[0][0].callback_data, 'rate:👍')
  assert.equal(result.reply_markup.inline_keyboard[0][1].callback_data, 'rate:👎')
})

test('returns deep-link-only keyboard when only deepLinkUrl', () => {
  const result = buildQuoteReplyMarkup({
    deepLinkUrl: 'https://t.me/testbot/app?startapp=q-abc-1',
    openInAppLabel: 'Open in app'
  })
  assert.equal(result.reply_markup.inline_keyboard.length, 1)
  assert.equal(result.reply_markup.inline_keyboard[0][0].text, 'Open in app')
  assert.equal(result.reply_markup.inline_keyboard[0][0].url, 'https://t.me/testbot/app?startapp=q-abc-1')
})

test('returns both rows when rateEnabled and deepLinkUrl', () => {
  const result = buildQuoteReplyMarkup({
    rateEnabled: true,
    deepLinkUrl: 'https://t.me/testbot/app?startapp=q-abc-1',
    openInAppLabel: 'Open in app'
  })
  assert.equal(result.reply_markup.inline_keyboard.length, 2)
  assert.equal(result.reply_markup.inline_keyboard[0][0].callback_data, 'rate:👍')
  assert.equal(result.reply_markup.inline_keyboard[1][0].url, 'https://t.me/testbot/app?startapp=q-abc-1')
})

test('skips deep-link row if openInAppLabel missing', () => {
  const result = buildQuoteReplyMarkup({
    rateEnabled: true,
    deepLinkUrl: 'https://t.me/testbot/app?startapp=q-abc-1'
    // openInAppLabel intentionally omitted
  })
  assert.equal(result.reply_markup.inline_keyboard.length, 1)
  assert.equal(result.reply_markup.inline_keyboard[0][0].callback_data, 'rate:👍')
})

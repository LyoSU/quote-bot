const test = require('node:test')
const assert = require('node:assert/strict')
const denormalizeQuote = require('./denormalize-quote')

const realUser = (id, first, last, username) => ({
  id, first_name: first, last_name: last, username
})
const channelChat = (id, title) => ({ id, title })
const hashedForward = (id, name) => ({ id, name })
const quotAI = () => ({
  id: 6,
  name: 'QuotAI',
  photo: { url: 'https://example.com/quotai.jpg' }
})

test('real user produces full author entry', () => {
  const msgs = [{ from: realUser(1234567890, 'Дмитро', 'Ш', 'dmshev'), text: 'hi' }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.deepEqual(result.authors[0], {
    telegram_id: 1234567890,
    first_name: 'Дмитро',
    last_name: 'Ш',
    username: 'dmshev',
    title: undefined,
    name: 'Дмитро Ш'
  })
})

test('low-id real user (Durov-like) is included', () => {
  const msgs = [{ from: realUser(1, 'Pavel', null, 'durov'), text: 'hi' }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.authors[0].telegram_id, 1)
  assert.equal(result.authors[0].name, 'Pavel')
})

test('channel sender_chat is included as author with title', () => {
  const msgs = [{ from: channelChat(-1001234, 'Канал X'), text: 'post' }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.authors[0].name, 'Канал X')
  assert.equal(result.authors[0].title, 'Канал X')
})

test('QuotAI synthetic author is included with name only', () => {
  const msgs = [
    { from: realUser(1234567890, 'Дмитро', null, 'dm'), text: 'q' },
    { from: quotAI(), text: 'AI-generated quote text' }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  const names = result.authors.map(a => a.name).sort()
  assert.deepEqual(names, ['QuotAI', 'Дмитро'])
})

test('hashed forward stub is included', () => {
  const msgs = [{ from: hashedForward(98765, 'Anonymous Sender'), text: 'fwd' }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.authors[0].name, 'Anonymous Sender')
  assert.equal(result.authors[0].telegram_id, 98765)
})

test('dedup by id for repeated real users', () => {
  const u = realUser(42, 'Kate', 'R', 'kate')
  const msgs = [
    { from: u, text: 'a' },
    { from: u, text: 'b' },
    { from: u, text: 'c' }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.messageCount, 3)
})

test('dedup by name when id absent', () => {
  const msgs = [
    { from: { name: 'QuotAI' }, text: 'a' },
    { from: { name: 'QuotAI' }, text: 'b' }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
})

test('hasVoice and hasMedia flags', () => {
  const msgs = [
    { from: realUser(1, 'A', null, null), voice: { duration: 10 } },
    { from: realUser(2, 'B', null, null), media: [{ file_id: 'x' }] }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.hasVoice, true)
  assert.equal(result.hasMedia, true)
})

test('privacy mode: authors empty, no chat_id, source.date preserved', () => {
  const msgs = [
    { from: realUser(1234567890, 'Дмитро', 'Ш', 'dmshev'), text: 'secret' }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } }, { privacy: true })
  assert.deepEqual(result.authors, [])
  assert.equal(result.source.chat_id, undefined)
  assert.deepEqual(result.source.message_ids, undefined)
  assert.ok(result.source.date instanceof Date)
})

test('from.name === false (streak non-first) still resolves display name via first_name', () => {
  const msgs = [{
    from: { id: 42, first_name: 'Kate', last_name: 'R', name: false },
    text: 'hi'
  }]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.equal(result.authors.length, 1)
  assert.equal(result.authors[0].name, 'Kate R')
})

test('source.date from reply_to_message.date (unix seconds -> Date)', () => {
  const msgs = [{ from: realUser(1, 'A', null, null), text: 'x' }]
  const result = denormalizeQuote(msgs, {
    chat: { id: -100500 },
    reply_to_message: { date: 1745000000 }
  })
  assert.ok(result.source.date instanceof Date)
  assert.equal(result.source.date.getTime(), 1745000000 * 1000)
})

test('source.message_ids collected from quoteMessages', () => {
  const msgs = [
    { from: realUser(1, 'A', null, null), text: 'x', message_id: 101 },
    { from: realUser(2, 'B', null, null), text: 'y', message_id: 102 }
  ]
  const result = denormalizeQuote(msgs, { chat: { id: -100500 } })
  assert.deepEqual(result.source.message_ids, [101, 102])
})

test('empty quoteMessages returns zero state', () => {
  const result = denormalizeQuote([], { chat: { id: -100500 } })
  assert.deepEqual(result.authors, [])
  assert.equal(result.messageCount, 0)
  assert.equal(result.hasVoice, false)
  assert.equal(result.hasMedia, false)
  assert.equal(result.text, undefined)
})

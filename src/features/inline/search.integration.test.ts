import { randomUUID } from 'node:crypto'
import { mongo, Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { inlineWordFilter } from './search'

// Optional real-Mongo checks: set INLINE_SEARCH_TEST_MONGO_URI to an isolated test server.
const uri = process.env.INLINE_SEARCH_TEST_MONGO_URI

describe.skipIf(!uri)('inline search on MongoDB', () => {
  const group = new Types.ObjectId()
  const otherGroup = new Types.ObjectId()
  const user = new Types.ObjectId()
  const otherUser = new Types.ObjectId()
  const client = new mongo.MongoClient(uri ?? 'mongodb://127.0.0.1:27017')
  const db = client.db(`inline_search_test_${randomUUID().replaceAll('-', '')}`)
  const quotes = db.collection('quotes')
  const liked = { 'rate.votes.vote': user, 'rate.votes.0.vote': user }

  beforeAll(async () => {
    await client.connect()
    const rate = { score: 5, votes: [{ name: '👍', vote: [user] }, { name: '👎', vote: [] }] }
    const archived = (file: string, fields: mongo.Document) => ({ file_id: file, group, rate, ...fields })
    await quotes.insertMany([
      archived('body', { payload: { messages: [{ text: 'HELLO world' }] }, authors: [{ name: 'Daniella Kozak' }] }),
      archived('author', { payload: { messages: [{ text: 'Other words' }] }, authors: [{ name: 'Serhii', username: 'lev_cli' }] }),
      archived('cyrillic', { payload: { messages: [{ text: 'Ну так вони мешаються' }] } }),
      archived('reply', { payload: { messages: [{ text: 'Response', replyMessage: { text: 'hello reply' } }] } }),
      archived('literal', { payload: { messages: [{ text: 'a+b [test] .*' }] } }),
      archived('legacy', { text: 'hello legacy' }),
      archived('forgotten', { text: 'hello legacy', forgottenAt: new Date() }),
      archived('unarchived', {}),
      archived('private-author', { payload: { messages: [{ text: 'Anonymous', from: { name: 'PrivateName' } }] }, authors: [] }),
      archived('downvoted', { payload: { messages: [{ text: 'hello' }] }, rate: { score: -1, votes: [{ name: '👍', vote: [] }, { name: '👎', vote: [user] }] } }),
      archived('unrated', { payload: { messages: [{ text: 'hello unrated' }] }, rate: undefined }),
      archived('', { payload: { messages: [{ text: 'hello' }] } }),
      { group, rate, payload: { messages: [{ text: 'hello' }] } },
      ...Array.from({ length: 10_000 }, () => ({
        group: otherGroup, file_id: 'unrelated',
        rate: { score: 10, votes: [{ name: '👍', vote: [otherUser] }, { name: '👎', vote: [] }] },
        payload: { messages: [{ text: 'hello world' }] },
      })),
    ])
    await quotes.createIndex({ group: 1, 'rate.score': -1 })
    await quotes.createIndex({ 'rate.votes.vote': 1, 'rate.score': -1 })
  }, 20_000)

  afterAll(async () => {
    try { await db.dropDatabase() } finally { await client.close() }
  })

  it.each([
    ['hello Daniella', ['body']],
    ['lev_cli', ['author']],
    ['МЕШАЮТЬСЯ', ['cyrillic']],
    ['hello reply', ['reply']],
    ['a+b [test] .*', ['literal']],
    ['legacy', ['legacy']],
    ['PrivateName', []],
    ['not-present', []],
  ])('returns only liked stickers matching %s', async (text, expected) => {
    const rows = await quotes.find({ ...liked, ...inlineWordFilter(text as string) }).toArray()
    expect(rows.map((row) => row.file_id).sort()).toEqual(expected)
  })

  it('find includes unrated group stickers while top excludes them', async () => {
    const rows = await quotes.find({ group, ...inlineWordFilter('unrated') }).toArray()
    expect(rows.map((row) => row.file_id)).toEqual(['unrated'])
    expect(await quotes.find({ group, 'rate.score': { $gt: 0 }, ...inlineWordFilter('unrated') }).toArray()).toEqual([])
  })

  it.each([['liked', liked], ['group', { group }]])('uses scope indexes for %s search', async (_scope, scope) => {
    const explain = await quotes.find({ ...scope, ...inlineWordFilter('no-match') })
      .project({ file_id: 1, rate: 1 }).sort({ 'rate.score': -1 }).limit(50).maxTimeMS(1500).explain('executionStats')
    expect(explain.executionStats.totalDocsExamined).toBeLessThan(20)
    expect(JSON.stringify(explain.queryPlanner.winningPlan)).toContain('IXSCAN')
    console.info(`${_scope} search: ${explain.executionStats.totalDocsExamined} docs examined of 10,013; ${explain.executionStats.executionTimeMillis} ms`)
  })
})

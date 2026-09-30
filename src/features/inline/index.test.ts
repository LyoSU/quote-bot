import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Api, Context } from 'grammy'
import { Types } from 'mongoose'
import type { BotContext } from '../../core/types'
import { inlineFeature, nextOffset } from './index'
import { inlineWordFilter, parseInlineSearch } from './search'

vi.mock('../../db/models', () => ({ Quote: { find: vi.fn() } }))
import { Quote } from '../../db/models'

// LIMIT is 50 in the module under test.
describe('nextOffset', () => {
  it('advances by the page size on a full raw page', () => {
    expect(nextOffset(0, 50)).toBe('50')
    expect(nextOffset(50, 50)).toBe('100')
  })

  it('ends pagination when the raw page is short', () => {
    expect(nextOffset(50, 49)).toBe('')
    expect(nextOffset(0, 0)).toBe('')
  })
})

describe('inline query parsing', () => {
  const groupId = '507f1f77bcf86cd799439011'

  it('uses the querying user scope for ordinary text, without a group id', () => {
    expect(parseInlineSearch('  hello Daniella  ')).toEqual({ scope: 'liked', text: 'hello Daniella' })
    expect(parseInlineSearch('   ')).toEqual({ scope: 'liked', text: '' })
  })

  it('accepts an explicitly embedded top group id and optional words', () => {
    expect(parseInlineSearch(`top:${groupId}`)).toEqual({ scope: 'top', groupId, text: '' })
    expect(parseInlineSearch(`top:${groupId}  hello world `)).toEqual({ scope: 'top', groupId, text: 'hello world' })
    expect(parseInlineSearch(`find:${groupId} hello`)).toEqual({ scope: 'find', groupId, text: 'hello' })
    expect(parseInlineSearch('top:invalid')).toEqual({ scope: 'liked', text: 'top:invalid' })
  })
})

describe('inline word filter', () => {
  it('keeps empty-query browsing unfiltered', () => {
    expect(inlineWordFilter(' \n ')).toEqual({})
  })

  it('requires each word, searching both content and archived authors', () => {
    const filter = inlineWordFilter(' hello\nДаніелла hello ')
    expect(filter.$and).toHaveLength(2)
    expect(filter.$and![0]).toMatchObject({ $or: expect.arrayContaining([
      { text: { $regex: 'hello', $options: 'i' } },
      { 'payload.messages.text': { $regex: 'hello', $options: 'i' } },
      { 'payload.messages.replyMessage.text': { $regex: 'hello', $options: 'i' } },
      { 'authors.name': { $regex: 'hello', $options: 'i' } },
    ]) })
    expect(filter.forgottenAt).toEqual({ $exists: false })
    expect(filter.file_id).toEqual({ $type: 'string', $ne: '' })
    expect(JSON.stringify(filter)).not.toContain('payload.messages.from')
  })

  it('treats regex metacharacters as literal query text', () => {
    const filter = inlineWordFilter('a+b .* [test]')
    const pattern = filter.$and!.map((part) => part.$or[0]!.text!.$regex)
    expect(pattern).toEqual(['a\\+b', '\\.\\*', '\\[test\\]'])
  })
})

describe('inline search handler', () => {
  const userId = new Types.ObjectId()
  let findQuery: {
    select: ReturnType<typeof vi.fn>
    sort: ReturnType<typeof vi.fn>
    skip: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
    maxTimeMS: ReturnType<typeof vi.fn>
    lean: ReturnType<typeof vi.fn>
  }

  function context(query: string, offset = '', withUser = true) {
    const ctx = new Context({
      update_id: 1,
      inline_query: { id: 'query-id', from: { id: 7, first_name: 'Caller', is_bot: false }, query, offset },
    }, new Api('test:token'), {
      id: 99, username: 'testbot', first_name: 'Bot', is_bot: true,
    } as Context['me']) as BotContext
    if (withUser) ctx.user = { _id: userId } as NonNullable<BotContext['user']>
    const answer = vi.fn<BotContext['answerInlineQuery']>(async () => true)
    ctx.answerInlineQuery = answer
    return { ctx, answer }
  }

  beforeEach(() => {
    vi.mocked(Quote.find).mockReset()
    findQuery = {
      select: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      maxTimeMS: vi.fn().mockReturnThis(), lean: vi.fn(async () => []),
    }
    vi.mocked(Quote.find).mockReturnValue(findQuery as never)
  })

  it('filters liked stickers in Mongo before pagination and keeps results personal', async () => {
    const quoteId = new Types.ObjectId()
    findQuery.lean.mockResolvedValue([{ _id: quoteId, file_id: 'sticker', rate: { votes: [], score: 5 } }])
    const { ctx, answer } = context('hello Daniella', '50')
    await inlineFeature.middleware()(ctx, async () => {})
    expect(Quote.find).toHaveBeenCalledWith({
      'rate.votes.vote': userId, 'rate.votes.0.vote': userId, ...inlineWordFilter('hello Daniella'),
    })
    expect(findQuery.skip).toHaveBeenCalledWith(50)
    expect(findQuery.select).toHaveBeenCalledWith({ file_id: 1, rate: 1 })
    expect(findQuery.limit).toHaveBeenCalledWith(50)
    expect(findQuery.maxTimeMS).toHaveBeenCalledWith(1500)
    expect(answer).toHaveBeenCalledWith([expect.objectContaining({ type: 'sticker', sticker_file_id: 'sticker' })], {
      is_personal: true, cache_time: 5, next_offset: '',
    })
  })

  it('retains empty-query browsing and advances a full page', async () => {
    findQuery.lean.mockResolvedValue(Array.from({ length: 50 }, () => ({ _id: new Types.ObjectId(), file_id: 'sticker' })))
    const { ctx, answer } = context('')
    await inlineFeature.middleware()(ctx, async () => {})
    expect(Quote.find).toHaveBeenCalledWith({ 'rate.votes.vote': userId, 'rate.votes.0.vote': userId })
    expect(answer.mock.calls[0]![1]).toMatchObject({ is_personal: true, next_offset: '50' })
  })

  it('filters a group only when its id is explicitly present in the query', async () => {
    const groupId = new Types.ObjectId()
    const { ctx, answer } = context(`top:${groupId} hello`, '', false)
    await inlineFeature.middleware()(ctx, async () => {})
    expect(Quote.find).toHaveBeenCalledWith({ group: groupId, 'rate.score': { $gt: 0 }, ...inlineWordFilter('hello') })
    expect(answer).toHaveBeenCalledWith([], { is_personal: false, cache_time: 5, next_offset: '' })
    expect(findQuery.sort).toHaveBeenCalledWith({ 'rate.score': -1 })
  })

  it.each(['', ' hello'])('find searches all group stickers without a positive-score restriction%s', async (words) => {
    const groupId = new Types.ObjectId()
    const { ctx, answer } = context(`find:${groupId}${words}`, '', false)
    await inlineFeature.middleware()(ctx, async () => {})
    expect(Quote.find).toHaveBeenCalledWith({
      group: groupId, file_id: { $type: 'string', $ne: '' }, ...inlineWordFilter(words),
    })
    expect(findQuery.sort).toHaveBeenCalledWith({ 'rate.score': -1 })
    expect(answer).toHaveBeenCalledWith([], { is_personal: false, cache_time: 5, next_offset: '' })
  })

  it('returns no personal results when the querying user is unresolved', async () => {
    const { ctx, answer } = context('hello', '', false)
    await inlineFeature.middleware()(ctx, async () => {})
    expect(Quote.find).not.toHaveBeenCalled()
    expect(answer).toHaveBeenCalledWith([], { cache_time: 5 })
  })

  it('answers with an empty page when Mongo times out', async () => {
    findQuery.lean.mockRejectedValue(new Error('Query exceeded time limit'))
    const { ctx, answer } = context('hello')
    await inlineFeature.middleware()(ctx, async () => {})
    expect(answer).toHaveBeenCalledWith([], { is_personal: true, cache_time: 5, next_offset: '' })
  })

  it.each(['-50', 'abc', '25bad', 'Infinity', '1.5'])('resets malformed offset %s', async (offset) => {
    const { ctx } = context('hello', offset)
    await inlineFeature.middleware()(ctx, async () => {})
    expect(findQuery.skip).toHaveBeenCalledWith(0)
  })
})

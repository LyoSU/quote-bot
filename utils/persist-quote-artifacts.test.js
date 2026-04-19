const test = require('node:test')
const assert = require('node:assert/strict')
const persistQuoteArtifacts = require('./persist-quote-artifacts')

function makeStubDb ({ createImpl, bulkWriteImpl } = {}) {
  const calls = { create: [], bulkWrite: [] }
  return {
    calls,
    Quote: {
      create: async (doc) => {
        calls.create.push(doc)
        if (createImpl) return createImpl(doc)
      }
    },
    GroupMember: {
      bulkWrite: async (ops, opts) => {
        calls.bulkWrite.push({ ops, opts })
        if (bulkWriteImpl) return bulkWriteImpl(ops, opts)
      }
    }
  }
}

test('writes Quote and GroupMember when both inputs present', async () => {
  const db = makeStubDb()
  const doc = { group: 'g1', user: 'u1', file_id: 'f1', file_unique_id: 'fu1', global_id: 42 }
  await persistQuoteArtifacts({ db, doc, groupId: 'g1', memberTgIds: [111, 222] })
  assert.equal(db.calls.create.length, 1)
  assert.equal(db.calls.create[0], doc)
  assert.equal(db.calls.bulkWrite.length, 1)
  assert.equal(db.calls.bulkWrite[0].ops.length, 2)
  assert.equal(db.calls.bulkWrite[0].opts.ordered, false)
  assert.equal(db.calls.bulkWrite[0].ops[0].updateOne.filter.telegram_id, 111)
  assert.equal(db.calls.bulkWrite[0].ops[1].updateOne.filter.telegram_id, 222)
})

test('skips bulkWrite when memberTgIds empty', async () => {
  const db = makeStubDb()
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [] })
  assert.equal(db.calls.create.length, 1)
  assert.equal(db.calls.bulkWrite.length, 0)
})

test('swallows duplicate-key (11000) errors silently', async (t) => {
  const errs = []
  const origError = console.error
  console.error = (...args) => { errs.push(args) }
  t.after(() => { console.error = origError })

  const db = makeStubDb({
    bulkWriteImpl: () => { const e = new Error('dup'); e.code = 11000; throw e }
  })
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [1] })
  assert.equal(errs.length, 0, 'duplicate-key error should not log')
})

test('logs (does not throw) Quote.create errors', async (t) => {
  const errs = []
  const origError = console.error
  console.error = (...args) => { errs.push(args) }
  t.after(() => { console.error = origError })

  const db = makeStubDb({
    createImpl: () => { throw new Error('create boom') }
  })
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x', global_id: 99 }, groupId: 'g1', memberTgIds: [] })
  assert.equal(errs.length, 1)
  assert.match(String(errs[0][0]), /\[quote:persist\] Quote\.create failed/)
})

test('logs non-11000 bulkWrite errors', async (t) => {
  const errs = []
  const origError = console.error
  console.error = (...args) => { errs.push(args) }
  t.after(() => { console.error = origError })

  const db = makeStubDb({
    bulkWriteImpl: () => { throw new Error('bulk boom') }
  })
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [1] })
  assert.equal(errs.length, 1)
  assert.match(String(errs[0][0]), /\[quote:persist\] GroupMember bulkWrite failed/)
})

test('continues to bulkWrite even if Quote.create fails', async (t) => {
  const origError = console.error
  console.error = () => {}
  t.after(() => { console.error = origError })

  const db = makeStubDb({
    createImpl: () => { throw new Error('boom') }
  })
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [1] })
  assert.equal(db.calls.bulkWrite.length, 1, 'bulkWrite should still run')
})

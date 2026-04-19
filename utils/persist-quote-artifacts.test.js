const test = require('node:test')
const assert = require('node:assert/strict')
const persistQuoteArtifacts = require('./persist-quote-artifacts')

function makeStubDb ({ createImpl, bulkWriteImpl, counterImpl, counterSeq = 7 } = {}) {
  const calls = { create: [], bulkWrite: [], counter: [] }
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
    },
    Counter: {
      findOneAndUpdate: async (filter, update, opts) => {
        calls.counter.push({ filter, update, opts })
        if (counterImpl) return counterImpl(filter, update, opts)
        return { seq: counterSeq }
      }
    }
  }
}

test('allocates global_id via Counter $inc and writes Quote + GroupMember', async () => {
  const db = makeStubDb({ counterSeq: 42 })
  const doc = { group: 'g1', user: 'u1', file_id: 'f1', file_unique_id: 'fu1' }
  await persistQuoteArtifacts({ db, doc, groupId: 'g1', memberTgIds: [111, 222] })
  assert.equal(db.calls.counter.length, 1)
  assert.deepEqual(db.calls.counter[0].filter, { _id: 'quote' })
  assert.deepEqual(db.calls.counter[0].update, { $inc: { seq: 1 } })
  assert.equal(doc.global_id, 42, 'global_id mutated onto doc before create')
  assert.equal(db.calls.create.length, 1)
  assert.equal(db.calls.create[0], doc)
  assert.equal(db.calls.bulkWrite.length, 1)
  assert.equal(db.calls.bulkWrite[0].ops.length, 2)
  assert.equal(db.calls.bulkWrite[0].opts.ordered, false)
})

test('skips bulkWrite when memberTgIds empty', async () => {
  const db = makeStubDb()
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [] })
  assert.equal(db.calls.create.length, 1)
  assert.equal(db.calls.bulkWrite.length, 0)
})

test('still creates Quote when Counter $inc fails (no global_id set)', async (t) => {
  const errs = []
  const origError = console.error
  console.error = (...args) => { errs.push(args) }
  t.after(() => { console.error = origError })

  const db = makeStubDb({
    counterImpl: () => { throw new Error('counter boom') }
  })
  const doc = { file_unique_id: 'x' }
  await persistQuoteArtifacts({ db, doc, groupId: 'g1', memberTgIds: [] })
  assert.equal(doc.global_id, undefined, 'global_id stays unset on counter failure')
  assert.equal(db.calls.create.length, 1)
  assert.equal(errs.length, 1)
  assert.match(String(errs[0][0]), /\[quote:persist\] Counter \$inc failed/)
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
  await persistQuoteArtifacts({ db, doc: { file_unique_id: 'x' }, groupId: 'g1', memberTgIds: [] })
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

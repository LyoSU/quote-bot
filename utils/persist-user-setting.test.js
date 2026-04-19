const test = require('node:test')
const assert = require('node:assert/strict')
const persistUserSetting = require('../helpers/persist-user-setting')

function makeCtx ({ userInfo, updateOneImpl } = {}) {
  const calls = { updateOne: [] }
  return {
    calls,
    session: { userInfo },
    db: {
      User: {
        updateOne: async (filter, update) => {
          calls.updateOne.push({ filter, update })
          if (updateOneImpl) return updateOneImpl(filter, update)
        }
      }
    }
  }
}

test('returns null and skips updateOne when session.userInfo missing', () => {
  const ctx = makeCtx({ userInfo: null })
  const result = persistUserSetting(ctx, { 'settings.privacy': true })
  assert.equal(result, null)
  assert.equal(ctx.calls.updateOne.length, 0)
})

test('returns null and skips updateOne when userInfo._id missing', () => {
  const ctx = makeCtx({ userInfo: { telegram_id: 123 /* no _id */ } })
  const result = persistUserSetting(ctx, { 'settings.privacy': true })
  assert.equal(result, null)
  assert.equal(ctx.calls.updateOne.length, 0)
})

test('calls User.updateOne with {_id} filter and supplied $set', async () => {
  const ctx = makeCtx({ userInfo: { _id: 'objectid-abc' } })
  await persistUserSetting(ctx, { 'settings.quote.backgroundColor': '#000' })
  assert.equal(ctx.calls.updateOne.length, 1)
  assert.deepEqual(ctx.calls.updateOne[0].filter, { _id: 'objectid-abc' })
  assert.deepEqual(ctx.calls.updateOne[0].update, { $set: { 'settings.quote.backgroundColor': '#000' } })
})

test('logs warning under [settings] prefix on updateOne failure', async (t) => {
  const warns = []
  const origWarn = console.warn
  console.warn = (...args) => { warns.push(args) }
  t.after(() => { console.warn = origWarn })

  const ctx = makeCtx({
    userInfo: { _id: 'x' },
    updateOneImpl: () => { throw new Error('mongo down') }
  })
  await persistUserSetting(ctx, { 'settings.privacy': true })
  assert.equal(warns.length, 1)
  assert.match(String(warns[0][0]), /\[settings\] User\.updateOne failed/)
})

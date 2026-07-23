import { describe, it, expect } from 'vitest'
import { verifyDatabase, EXPECTED_INDEXES, CAPPED_COLLECTIONS, type DbHandle } from './verify'

interface IndexInfo {
  key: Record<string, number>
  unique?: boolean
}

/**
 * Builds a stub db handle from per-collection index lists + a capped set.
 * Anything not listed throws from listIndexes/isCapped, exercising the
 * error-swallowing path.
 */
function stubDb(
  indexesByCollection: Record<string, IndexInfo[]>,
  cappedCollections: Set<string>,
): DbHandle {
  return {
    collection(name) {
      const indexes = indexesByCollection[name]
      return {
        listIndexes: () => ({
          toArray: async () => {
            if (!indexes) throw new Error(`no such collection ${name}`)
            return indexes
          },
        }),
        isCapped: async () => cappedCollections.has(name),
      }
    },
  }
}

/** A db handle that satisfies every declared expectation. */
function healthyDb(): DbHandle {
  const byCollection: Record<string, IndexInfo[]> = {}
  for (const exp of EXPECTED_INDEXES) {
    byCollection[exp.collection] ??= [{ key: { _id: 1 } }]
    byCollection[exp.collection]!.push({ key: exp.key, unique: exp.unique })
  }
  for (const name of CAPPED_COLLECTIONS) byCollection[name] ??= [{ key: { _id: 1 } }]
  return stubDb(byCollection, new Set(CAPPED_COLLECTIONS))
}

describe('verifyDatabase', () => {
  it('reports no warnings when every expectation holds', async () => {
    expect(await verifyDatabase(healthyDb())).toEqual([])
  })

  it('warns about a missing index', async () => {
    const byCollection: Record<string, IndexInfo[]> = {}
    for (const exp of EXPECTED_INDEXES) {
      byCollection[exp.collection] ??= [{ key: { _id: 1 } }]
      // Omit the quotes.global_id index specifically.
      if (!(exp.collection === 'quotes' && 'global_id' in exp.key)) {
        byCollection[exp.collection]!.push({ key: exp.key, unique: exp.unique })
      }
    }
    for (const name of CAPPED_COLLECTIONS) byCollection[name] ??= [{ key: { _id: 1 } }]

    const warnings = await verifyDatabase(stubDb(byCollection, new Set(CAPPED_COLLECTIONS)))
    expect(warnings).toContain('missing index quotes {"global_id":1}')
  })

  it('warns when a unique index is not unique', async () => {
    const byCollection: Record<string, IndexInfo[]> = {}
    for (const exp of EXPECTED_INDEXES) {
      byCollection[exp.collection] ??= [{ key: { _id: 1 } }]
      const unique = !(exp.collection === 'users') && exp.unique
      byCollection[exp.collection]!.push({ key: exp.key, unique })
    }
    for (const name of CAPPED_COLLECTIONS) byCollection[name] ??= [{ key: { _id: 1 } }]

    const warnings = await verifyDatabase(stubDb(byCollection, new Set(CAPPED_COLLECTIONS)))
    expect(warnings).toContain('non-unique index users {"telegram_id":1}')
  })

  it('warns when a capped collection is not capped', async () => {
    const warnings = await verifyDatabase(
      stubDb(
        Object.fromEntries(
          EXPECTED_INDEXES.map((e) => [e.collection, [{ key: { _id: 1 } }, { key: e.key, unique: e.unique }]]),
        ),
        new Set(), // nothing capped
      ),
    )
    expect(warnings).toContain('collection stats is not capped')
  })

  it('never throws when the driver rejects (e.g. no permission)', async () => {
    const throwingDb: DbHandle = {
      collection() {
        return {
          listIndexes: () => ({ toArray: async () => Promise.reject(new Error('unauthorized')) }),
          isCapped: async () => Promise.reject(new Error('unauthorized')),
        }
      },
    }
    // Errors are swallowed to a debug log — no warnings, no throw.
    expect(await verifyDatabase(throwingDb)).toEqual([])
  })
})

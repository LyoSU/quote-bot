import { connection } from './connection'
import { logger } from '../core/logger'

const log = logger.child({ module: 'db-verify' })

/**
 * connection.ts sets `autoIndex`/`autoCreate` off on purpose — the uniqueness
 * guarantees behind `global_id`/`local_id`/`file_unique_id`/`telegram_id` and
 * the capped Stats collection all live in out-of-band infra, invisible to the
 * process. This is a warn-only boot check that those expectations actually hold
 * against the live database: it never creates or repairs anything, never
 * throws, and swallows access errors (e.g. no `listIndexes` permission) as a
 * debug log — a missing index is an ops alert, not a reason to refuse to start.
 */

interface IndexExpectation {
  /** Mongoose-pluralized collection name (model name lower-cased + pluralized). */
  collection: string
  /** Index key, order-significant for compound indexes. */
  key: Record<string, 1 | -1>
  unique: boolean
}

/** Derived 1:1 from the `schema.index(...)` declarations in src/db/models/*. */
export const EXPECTED_INDEXES: readonly IndexExpectation[] = [
  { collection: 'users', key: { telegram_id: 1 }, unique: true },
  { collection: 'groups', key: { group_id: 1 }, unique: true },
  { collection: 'quotes', key: { file_unique_id: 1 }, unique: true },
  { collection: 'quotes', key: { global_id: 1 }, unique: true },
  { collection: 'quotes', key: { group: 1, local_id: 1 }, unique: true },
  { collection: 'groupmembers', key: { telegram_id: 1, group: 1 }, unique: true },
]

/** Collections that MUST be capped (schema declares `capped`, never built at boot). */
export const CAPPED_COLLECTIONS: readonly string[] = ['stats']

interface IndexInfo {
  key: Record<string, number>
  unique?: boolean
}

interface CollectionHandle {
  listIndexes(): { toArray(): Promise<IndexInfo[]> }
  isCapped(): Promise<boolean>
}

/** The subset of the native Mongo `Db` this verifier needs — stubbable in tests. */
export interface DbHandle {
  collection(name: string): CollectionHandle
}

/** Same keys, same order, same directions. */
function sameKey(a: Record<string, number>, b: Record<string, number>): boolean {
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  return ak.every((k, i) => bk[i] === k && a[k] === b[k])
}

/**
 * Verifies expected indexes and capped collections exist. Returns the list of
 * warnings it emitted (empty = all good) so it stays unit-testable; logs each
 * as a `warn` for ops. Never throws.
 */
export async function verifyDatabase(db?: DbHandle): Promise<string[]> {
  const handle = db ?? (connection.db as unknown as DbHandle | undefined)
  if (!handle) {
    log.debug('database handle not ready — skipping verification')
    return []
  }

  const warnings: string[] = []

  for (const exp of EXPECTED_INDEXES) {
    try {
      const indexes = await handle.collection(exp.collection).listIndexes().toArray()
      const match = indexes.find((ix) => sameKey(ix.key, exp.key))
      if (!match) {
        warnings.push(`missing index ${exp.collection} ${JSON.stringify(exp.key)}`)
        log.warn({ collection: exp.collection, key: exp.key }, 'expected index is missing')
      } else if (exp.unique && !match.unique) {
        warnings.push(`non-unique index ${exp.collection} ${JSON.stringify(exp.key)}`)
        log.warn({ collection: exp.collection, key: exp.key }, 'expected unique index is not unique')
      }
    } catch (err) {
      log.debug({ err, collection: exp.collection }, 'index check skipped')
    }
  }

  for (const name of CAPPED_COLLECTIONS) {
    try {
      if (!(await handle.collection(name).isCapped())) {
        warnings.push(`collection ${name} is not capped`)
        log.warn({ collection: name }, 'expected a capped collection')
      }
    } catch (err) {
      log.debug({ err, collection: name }, 'capped check skipped')
    }
  }

  return warnings
}

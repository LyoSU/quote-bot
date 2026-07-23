import { describe, it, expect } from 'vitest'
import { Types } from 'mongoose'
import { applyVote, buildVoteUpdate, ensureVotes } from './rate'

const votes = () => [
  { name: '👍', vote: [] as (Types.ObjectId | string)[] },
  { name: '👎', vote: [] as (Types.ObjectId | string)[] },
]

describe('applyVote', () => {
  it('records a new vote', () => {
    const v = votes()
    const id = new Types.ObjectId()
    expect(applyVote(v, id, '👍')).toBe('rated')
    expect(v[0]!.vote).toHaveLength(1)
  })

  it('toggles the same vote off', () => {
    const v = votes()
    const id = new Types.ObjectId()
    applyVote(v, id, '👍')
    expect(applyVote(v, id, '👍')).toBe('back')
    expect(v[0]!.vote).toHaveLength(0)
  })

  it('moves a vote from 👍 to 👎', () => {
    const v = votes()
    const id = new Types.ObjectId()
    applyVote(v, id, '👍')
    expect(applyVote(v, id, '👎')).toBe('rated')
    expect(v[0]!.vote).toHaveLength(0)
    expect(v[1]!.vote).toHaveLength(1)
  })

  it('matches legacy string-stored ids (regression: v.equals is not a function)', () => {
    const id = new Types.ObjectId()
    const v = [
      { name: '👍', vote: [id.toString()] as (Types.ObjectId | string)[] }, // legacy string id
      { name: '👎', vote: [] as (Types.ObjectId | string)[] },
    ]
    // Same user taps 👍 again → should remove their (string) vote, not throw.
    expect(applyVote(v, id, '👍')).toBe('back')
    expect(v[0]!.vote).toHaveLength(0)
  })
})

describe('ensureVotes', () => {
  it('defaults to empty 👍/👎 buckets for a quote without rate data', () => {
    const v = ensureVotes({ rate: undefined })
    expect(v.map((r) => r.name)).toEqual(['👍', '👎'])
  })
})

// ---------------------------------------------------------------------------
// buildVoteUpdate produces a MongoDB aggregation-pipeline update. There is no
// in-memory Mongo in this suite, so we evaluate the pipeline with a tiny
// interpreter covering exactly the operators it emits. This proves the update
// derives its result from the *live* `rate.votes` field (the whole point of the
// atomic rewrite) and matches applyVote's toggle semantics.
// ---------------------------------------------------------------------------

type Vars = Record<string, unknown>
type Doc = Record<string, unknown>

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Resolves a dotted field path, mapping over arrays like MongoDB does. */
function getField(val: unknown, segs: string[]): unknown {
  if (segs.length === 0) return val
  if (Array.isArray(val)) return val.map((v) => getField(v, segs))
  if (!isRecord(val)) return undefined
  const [head, ...rest] = segs
  return getField(val[head!], rest)
}

function evalExpr(expr: unknown, root: unknown, vars: Vars): unknown {
  if (expr instanceof Types.ObjectId) return expr
  if (Array.isArray(expr)) return expr.map((e) => evalExpr(e, root, vars))
  if (typeof expr === 'string') {
    if (expr.startsWith('$$')) return getField(vars, expr.slice(2).split('.'))
    if (expr.startsWith('$')) return getField(root, expr.slice(1).split('.'))
    return expr
  }
  if (!isRecord(expr)) return expr

  const keys = Object.keys(expr)
  if (keys.length === 1 && keys[0]!.startsWith('$')) {
    const op = keys[0]!
    const arg = expr[op]
    const args = Array.isArray(arg) ? arg : [arg]
    switch (op) {
      case '$ifNull': {
        const va = evalExpr(args[0], root, vars)
        return va === null || va === undefined ? evalExpr(args[1], root, vars) : va
      }
      case '$arrayElemAt': {
        const arr = evalExpr(args[0], root, vars)
        return Array.isArray(arr) ? arr[args[1] as number] : undefined
      }
      case '$filter': {
        const { input, as, cond } = arg as { input: unknown; as: string; cond: unknown }
        const arr = evalExpr(input, root, vars)
        return Array.isArray(arr) ? arr.filter((el) => Boolean(evalExpr(cond, root, { ...vars, [as]: el }))) : []
      }
      case '$map': {
        const { input, as, in: inE } = arg as { input: unknown; as: string; in: unknown }
        const arr = evalExpr(input, root, vars)
        return Array.isArray(arr) ? arr.map((el) => evalExpr(inE, root, { ...vars, [as]: el })) : []
      }
      case '$in': {
        const needle = evalExpr(args[0], root, vars)
        const arr = evalExpr(args[1], root, vars)
        return Array.isArray(arr) && arr.some((x) => x === needle)
      }
      case '$ne':
        return evalExpr(args[0], root, vars) !== evalExpr(args[1], root, vars)
      case '$toString':
        return String(evalExpr(arg, root, vars))
      case '$concatArrays':
        return args.reduce<unknown[]>((acc, p) => {
          const v = evalExpr(p, root, vars)
          return acc.concat(Array.isArray(v) ? v : [v])
        }, [])
      case '$cond':
        return Boolean(evalExpr(args[0], root, vars))
          ? evalExpr(args[1], root, vars)
          : evalExpr(args[2], root, vars)
      case '$and':
        return args.every((e) => Boolean(evalExpr(e, root, vars)))
      case '$not':
        return !evalExpr(args[0], root, vars)
      case '$size': {
        const arr = evalExpr(arg, root, vars)
        return Array.isArray(arr) ? arr.length : 0
      }
      case '$subtract':
        return (evalExpr(args[0], root, vars) as number) - (evalExpr(args[1], root, vars) as number)
      default:
        throw new Error(`unhandled operator ${op}`)
    }
  }

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(expr)) out[k] = evalExpr(v, root, vars)
  return out
}

/** Runs buildVoteUpdate's single `$set` stage against `doc`, returning the new doc. */
function applyPipeline(doc: Doc, userId: Types.ObjectId | string, rateName: string): Doc {
  const stage = buildVoteUpdate(userId, rateName)[0] as { $set: Record<string, unknown> }
  const rate: Record<string, unknown> = isRecord(doc.rate) ? { ...doc.rate } : {}
  for (const [key, exprValue] of Object.entries(stage.$set)) {
    const field = key.replace(/^rate\./, '')
    rate[field] = evalExpr(exprValue, doc, {})
  }
  return { ...doc, rate }
}

const bucketVotes = (doc: Doc, i: number): unknown[] =>
  ((doc.rate as { votes: { vote: unknown[] }[] }).votes[i]?.vote ?? []) as unknown[]

describe('buildVoteUpdate (pipeline semantics)', () => {
  const emptyDoc = (): Doc => ({ rate: { votes: [{ name: '👍', vote: [] }, { name: '👎', vote: [] }] } })

  it('records a new vote and stores it as an ObjectId', () => {
    const id = new Types.ObjectId()
    const doc = applyPipeline(emptyDoc(), id, '👍')
    expect(bucketVotes(doc, 0)).toHaveLength(1)
    expect(bucketVotes(doc, 0)[0]).toBeInstanceOf(Types.ObjectId)
    expect((doc.rate as { score: number }).score).toBe(1)
  })

  it('retracts the vote when the same bucket is tapped again', () => {
    const id = new Types.ObjectId()
    const doc = applyPipeline(applyPipeline(emptyDoc(), id, '👍'), id, '👍')
    expect(bucketVotes(doc, 0)).toHaveLength(0)
    expect((doc.rate as { score: number }).score).toBe(0)
  })

  it('moves a vote from 👍 to 👎', () => {
    const id = new Types.ObjectId()
    const doc = applyPipeline(applyPipeline(emptyDoc(), id, '👍'), id, '👎')
    expect(bucketVotes(doc, 0)).toHaveLength(0)
    expect(bucketVotes(doc, 1)).toHaveLength(1)
    expect((doc.rate as { score: number }).score).toBe(-1)
  })

  it('matches legacy string-stored ids', () => {
    const id = new Types.ObjectId()
    const doc: Doc = { rate: { votes: [{ name: '👍', vote: [id.toString()] }, { name: '👎', vote: [] }] } }
    const after = applyPipeline(doc, id, '👍')
    expect(bucketVotes(after, 0)).toHaveLength(0)
  })

  it('repairs missing rate.votes in place (like ensureVotes)', () => {
    const id = new Types.ObjectId()
    const doc = applyPipeline({ rate: {} }, id, '👍')
    expect((doc.rate as { votes: { name: string }[] }).votes.map((v) => v.name)).toEqual(['👍', '👎'])
    expect(bucketVotes(doc, 0)).toHaveLength(1)
  })

  it('composes concurrent votes instead of clobbering (the lost-update fix)', () => {
    const a = new Types.ObjectId()
    const b = new Types.ObjectId()
    // Serialized server-side execution: B derives from the doc A already wrote.
    const doc = applyPipeline(applyPipeline(emptyDoc(), a, '👍'), b, '👍')
    expect(bucketVotes(doc, 0)).toHaveLength(2)
    expect((doc.rate as { score: number }).score).toBe(2)
  })
})

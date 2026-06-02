import { describe, it, expect } from 'vitest'
import { aggregateHistogram, quantile, type MetricValue } from './ping'

// Shape mirrors prom-client's Histogram.get().values (15.x).
const hist = (...vals: MetricValue[]) => vals

describe('aggregateHistogram', () => {
  it('sums buckets/sum/count across label sets', () => {
    const { buckets, sum, count } = aggregateHistogram(
      hist(
        { metricName: 'd_bucket', labels: { le: 0.01, ok: 'true' }, value: 1 },
        { metricName: 'd_bucket', labels: { le: 0.1, ok: 'true' }, value: 2 },
        { metricName: 'd_bucket', labels: { le: '+Inf', ok: 'true' }, value: 2 },
        { metricName: 'd_sum', labels: { ok: 'true' }, value: 0.11 },
        { metricName: 'd_count', labels: { ok: 'true' }, value: 2 },
        { metricName: 'd_bucket', labels: { le: 0.01, ok: 'false' }, value: 0 },
        { metricName: 'd_bucket', labels: { le: 0.1, ok: 'false' }, value: 1 },
        { metricName: 'd_bucket', labels: { le: '+Inf', ok: 'false' }, value: 1 },
        { metricName: 'd_sum', labels: { ok: 'false' }, value: 0.05 },
        { metricName: 'd_count', labels: { ok: 'false' }, value: 1 },
      ),
    )
    expect(count).toBe(3)
    expect(sum).toBeCloseTo(0.16)
    expect(buckets).toEqual([
      { le: 0.01, count: 1 },
      { le: 0.1, count: 3 },
      { le: Infinity, count: 3 },
    ])
  })
})

describe('quantile', () => {
  const buckets = [
    { le: 0.01, count: 1 },
    { le: 0.1, count: 3 },
    { le: Infinity, count: 3 },
  ]

  it('returns 0 for an empty histogram', () => {
    expect(quantile([], 0, 0.95)).toBe(0)
  })

  it('interpolates linearly within the crossing bucket', () => {
    // rank = 0.95*3 = 2.85, falls in (0.01, 0.1] which spans counts 1→3.
    // 0.01 + ((2.85-1)/2)*(0.1-0.01) = 0.01 + 0.925*0.09 = 0.09325
    expect(quantile(buckets, 3, 0.95)).toBeCloseTo(0.09325)
  })

  it('never interpolates into the +Inf bucket', () => {
    // A long tail past the last finite boundary clamps to that boundary.
    const tail = [
      { le: 0.1, count: 1 },
      { le: Infinity, count: 10 },
    ]
    expect(quantile(tail, 10, 0.99)).toBe(0.1)
  })
})

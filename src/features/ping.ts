import { Composer } from 'grammy'
import type { BotContext } from '../core/types'
import { updateDuration, updatesTotal } from '../core/metrics'

/**
 * /ping — liveness check + a live performance snapshot.
 *
 * Ported from the legacy handler (which read RPS / avg / p95 out of Redis
 * buckets and showed webhook queue depth). This process is single and
 * long-polling, so those numbers now come from Prometheus instead: the
 * `updateDuration` histogram yields avg (sum/count) and p95 (bucket
 * interpolation), and `updatesTotal` tells us how much group noise the
 * fast-path dropped — a figure the old bot couldn't report. As before, the
 * reply auto-deletes in groups so it doesn't clutter the chat.
 */
export const ping = new Composer<BotContext>()

export type MetricValue = { value: number; metricName?: string; labels: Record<string, string | number> }

/** Sum a histogram's buckets/sum/count across all label sets (e.g. ok=true|false). */
export function aggregateHistogram(values: MetricValue[]): { buckets: { le: number; count: number }[]; sum: number; count: number } {
  const byLe = new Map<number, number>()
  let sum = 0
  let count = 0
  for (const v of values) {
    if (v.metricName?.endsWith('_bucket')) {
      const le = v.labels.le === '+Inf' ? Infinity : Number(v.labels.le)
      byLe.set(le, (byLe.get(le) ?? 0) + v.value)
    } else if (v.metricName?.endsWith('_sum')) sum += v.value
    else if (v.metricName?.endsWith('_count')) count += v.value
  }
  const buckets = [...byLe.entries()].map(([le, c]) => ({ le, count: c })).sort((a, b) => a.le - b.le)
  return { buckets, sum, count }
}

/** φ-quantile from cumulative buckets — the same linear interpolation Prometheus uses. */
export function quantile(buckets: { le: number; count: number }[], count: number, q: number): number {
  if (count === 0) return 0
  const rank = q * count
  let prevLe = 0
  let prevCount = 0
  for (const b of buckets) {
    if (b.count >= rank) {
      if (!Number.isFinite(b.le)) return prevLe // can't interpolate into +Inf
      const inBucket = b.count - prevCount
      return inBucket <= 0 ? b.le : prevLe + ((rank - prevCount) / inBucket) * (b.le - prevLe)
    }
    if (Number.isFinite(b.le)) prevLe = b.le
    prevCount = b.count
  }
  return prevLe
}

const counterValue = (values: MetricValue[], relevant: string): number =>
  values.find((v) => v.labels.relevant === relevant)?.value ?? 0

const ms = (sec: number): string => {
  const v = sec * 1000
  return v < 10 ? `${v.toFixed(1)} ms` : `${Math.round(v)} ms`
}

const group = (n: number): string => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')

const uptime = (sec: number): string => {
  const d = Math.floor(sec / 86_400)
  const h = Math.floor((sec % 86_400) / 3_600)
  const m = Math.floor((sec % 3_600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m`
  return `${Math.floor(sec)}s`
}

ping.command('ping', async (ctx) => {
  const sent = await ctx.reply('🏓 pong…')
  const rtt = Math.max(0, Date.now() - sent.date * 1000)

  const [dur, upd, hook] = await Promise.all([
    updateDuration.get(),
    updatesTotal.get(),
    // Even under long polling this reports the backlog Telegram is holding for us.
    ctx.api.getWebhookInfo().catch(() => ({ pending_update_count: 0 })),
  ])
  const { buckets, sum, count } = aggregateHistogram(dur.values as MetricValue[])
  const avg = count ? sum / count : 0
  const p95 = quantile(buckets, count, 0.95)

  const relevant = counterValue(upd.values as MetricValue[], 'true')
  const gab = counterValue(upd.values as MetricValue[], 'gab')
  const noise = counterValue(upd.values as MetricValue[], 'false')
  const total = relevant + gab + noise
  const handled = relevant + gab
  const noisePct = total ? (noise / total) * 100 : 0
  const rss = Math.round(process.memoryUsage().rss / 1_048_576)

  const body = [
    `⏱ latency`,
    `   avg  ${count ? ms(avg) : '—'}`,
    `   p95  ${count ? ms(p95) : '—'}`,
    `📊 updates  (uptime ${uptime(process.uptime())})`,
    `   handled       ${group(handled)}`,
    `   noise dropped  ${noisePct.toFixed(1)} %  (${group(noise)})`,
    `   gab fires      ${group(gab)}`,
    `   queue pending  ${group(hook.pending_update_count ?? 0)}`,
    `🧠 memory  ${rss} MB rss`,
  ].join('\n')

  await ctx.api
    .editMessageText(sent.chat.id, sent.message_id, `🏓 <b>pong</b> · ${rtt} ms\n<pre>${body}</pre>`, {
      parse_mode: 'HTML',
    })
    .catch(() => {})

  // Keep group chats tidy: drop the reply (and the command, if we may) shortly
  // after. In private chats we leave it for the user to read.
  if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
    setTimeout(() => {
      void ctx.api.deleteMessage(sent.chat.id, sent.message_id).catch(() => {})
      if (ctx.message) void ctx.api.deleteMessage(sent.chat.id, ctx.message.message_id).catch(() => {})
    }, 15_000)
  }
})

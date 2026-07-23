import { afterEach, describe, expect, it } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { startHealthServer, type HealthReport } from './server'

let server: Server | undefined

afterEach(() => {
  server?.close()
  server = undefined
})

async function listen(report: () => HealthReport): Promise<string> {
  server = startHealthServer({ check: report }, 0, '127.0.0.1')
  await new Promise<void>((resolve) => server?.once('listening', resolve))
  const { port } = server?.address() as AddressInfo
  return `http://127.0.0.1:${port}`
}

describe('health server', () => {
  it('answers 200 with per-component detail while healthy', async () => {
    const base = await listen(() => ({
      ok: true,
      detail: { runner: true, db: true, pollFresh: true, pollAgeSeconds: 3 },
    }))

    const res = await fetch(`${base}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      status: 'ok',
      runner: true,
      db: true,
      pollFresh: true,
      pollAgeSeconds: 3,
    })
  })

  it('answers 503 and names the failed component', async () => {
    const base = await listen(() => ({
      ok: false,
      detail: { runner: true, db: true, pollFresh: false, pollAgeSeconds: 120 },
    }))

    const res = await fetch(`${base}/health`)
    expect(res.status).toBe(503)
    const body = (await res.json()) as { status: string; pollFresh: boolean; pollAgeSeconds: number }
    expect(body.status).toBe('unhealthy')
    expect(body.pollFresh).toBe(false)
    expect(body.pollAgeSeconds).toBe(120)
  })

  it('serves Prometheus metrics', async () => {
    const base = await listen(() => ({ ok: true, detail: {} }))

    const res = await fetch(`${base}/metrics`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')
    expect(await res.text()).toContain('bot_')
  })

  it('404s everything else', async () => {
    const base = await listen(() => ({ ok: true, detail: {} }))

    const res = await fetch(`${base}/nope`)
    expect(res.status).toBe(404)
  })
})

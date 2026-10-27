/**
 * Bot tokens look like `123456789:AA…` and ride inside Bot API URLs
 * (`…/bot<TOKEN>/method`, `…/file/bot<TOKEN>/path`). A network error message
 * can embed such a URL, so anything that reaches a log line (or the owner's
 * chat) goes through {@link redactSecrets} first.
 */
const TOKEN_RE = /\d{6,12}:[A-Za-z0-9_-]{30,}/g

export function redactSecrets(text: string): string {
  return text.replace(TOKEN_RE, '<redacted>')
}

/** Redacts every string inside an arbitrary log payload (Errors become plain objects). */
export function redactDeep(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return redactSecrets(value)
  if (value === null || typeof value !== 'object' || depth > 6) return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1, seen))
  if (value instanceof Error) {
    // Keep the prototype so the logger's error serializer still recognises it.
    const out: Error = Object.create(Object.getPrototypeOf(value))
    Object.defineProperty(out, 'message', { value: redactSecrets(value.message), enumerable: false })
    if (value.stack) Object.defineProperty(out, 'stack', { value: redactSecrets(value.stack), enumerable: false })
    for (const [k, v] of Object.entries(value)) Object.defineProperty(out, k, { value: redactDeep(v, depth + 1, seen), enumerable: true })
    if (value.cause !== undefined) Object.defineProperty(out, 'cause', { value: redactDeep(value.cause, depth + 1, seen), enumerable: false })
    return out
  }
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) out[k] = redactDeep(v, depth + 1, seen)
  return out
}

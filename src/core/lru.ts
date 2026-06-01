/**
 * Minimal bounded LRU cache with per-entry TTL.
 *
 * Used by the repositories to cache hot User/Group lookups without an
 * unbounded in-memory map (the kind that quietly leaks in the old code). Map
 * iteration order is insertion order, so the first key is always the
 * least-recently-used — eviction is O(1).
 */
export class LruCache<K, V> {
  private readonly map = new Map<K, { value: V; expiresAt: number }>()

  constructor(
    private readonly max: number,
    private readonly ttlMs: number,
  ) {}

  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key)
      return undefined
    }
    // Touch: move to most-recently-used position.
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  set(key: K, value: V): void {
    this.map.delete(key)
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs })
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
  }

  delete(key: K): void {
    this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}

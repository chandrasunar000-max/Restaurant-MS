// Tiny in-memory cache with TTL and namespace/prefix invalidation
class TTLCache {
  constructor() {
    this.store = new Map(); // key -> { value, expiresAt }
  }
  now() { return Date.now(); }
  key(k) { return String(k); }
  get(k) {
    const key = this.key(k);
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt < this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(k, v, ttlMs) {
    const key = this.key(k);
    const expiresAt = ttlMs ? (this.now() + ttlMs) : 0;
    this.store.set(key, { value: v, expiresAt });
  }
  del(k) { this.store.delete(this.key(k)); }
  delByPrefix(prefix) {
    const p = String(prefix);
    for (const key of this.store.keys()) {
      if (key.startsWith(p)) this.store.delete(key);
    }
  }
}

export const cache = new TTLCache();

export const seconds = (s) => s * 1000;

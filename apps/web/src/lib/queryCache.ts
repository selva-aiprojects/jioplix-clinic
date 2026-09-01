const store = new Map<string, { value: unknown; expiresAt: number }>()

const DEFAULT_TTL_MS = 5 * 60 * 1000

export function cacheGet<T>(key: string, fetchFn: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return Promise.resolve(hit.value as T)
  }
  return fetchFn().then(value => {
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  })
}

export function cacheInvalidate(prefix: string): void {
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

export function cacheClear(): void {
  store.clear()
}

const entries = new Map();
const pending = new Map();

export function readCached(key) {
  const entry = entries.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return undefined;
  }
  return entry.value;
}

export function writeCached(key, value, ttl = 120000) {
  entries.set(key, { value, expiresAt: Date.now() + ttl });
  return value;
}

export function cachedQuery(key, loader, ttl = 120000) {
  const cached = readCached(key);
  if (cached !== undefined) return Promise.resolve(cached);

  if (!pending.has(key)) {
    const request = Promise.resolve()
      .then(loader)
      .then((value) => pending.get(key) === request ? writeCached(key, value, ttl) : value)
      .finally(() => {
        if (pending.get(key) === request) pending.delete(key);
      });
    pending.set(key, request);
  }
  return pending.get(key);
}

export function invalidateCached(...prefixes) {
  for (const key of entries.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      entries.delete(key);
    }
  }
}

export function clearQueryCache() {
  entries.clear();
  pending.clear();
}

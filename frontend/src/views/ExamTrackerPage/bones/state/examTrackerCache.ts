import { CACHE_TTL_MS, CacheEntry } from './examTrackerConstants';

// Simple in-memory cache (per session) - no persistence.
const store = new Map<string, CacheEntry<any>>();

export function getCache<T>(key:string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.ts > CACHE_TTL_MS) { // stale
    store.delete(key);
    return undefined;
  }
  return hit.data as T;
}

export function setCache<T>(key:string, data:T) {
  store.set(key, { data, ts: Date.now() });
}

export function invalidatePrefix(prefix:string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

export function clearExamTrackerCache() { store.clear(); }

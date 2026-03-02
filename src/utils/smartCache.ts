type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type PendingPromise<T> = Promise<T>;

type SmartCacheOptions = {
  prefix?: string;
  fallbackToSessionStorage?: boolean;
};

const DEFAULT_PREFIX = "smart-cache:v2";

function now() {
  return Date.now();
}

function safeStorageAvailable() {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

function buildStorageKey(prefix: string, key: string) {
  return `${prefix}:${key}`;
}

export function createSmartCache(options?: SmartCacheOptions) {
  const prefix = options?.prefix ?? DEFAULT_PREFIX;
  const allowSessionFallback = options?.fallbackToSessionStorage ?? true;
  const memory = new Map<string, CacheEntry<unknown>>();
  const pending = new Map<string, PendingPromise<unknown>>();

  const readFromSession = <T>(key: string): CacheEntry<T> | null => {
    if (!allowSessionFallback || !safeStorageAvailable()) return null;
    try {
      const raw = sessionStorage.getItem(buildStorageKey(prefix, key));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      if (!parsed || typeof parsed.expiresAt !== "number") return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeToSession = <T>(key: string, entry: CacheEntry<T>) => {
    if (!allowSessionFallback || !safeStorageAvailable()) return;
    try {
      sessionStorage.setItem(buildStorageKey(prefix, key), JSON.stringify(entry));
    } catch {
      // silent fail for private mode / quota
    }
  };

  const removeFromSession = (key: string) => {
    if (!allowSessionFallback || !safeStorageAvailable()) return;
    try {
      sessionStorage.removeItem(buildStorageKey(prefix, key));
    } catch {
      // silent fail
    }
  };

  const isExpired = (entry?: CacheEntry<unknown> | null) => !entry || entry.expiresAt <= now();

  const get = <T>(key: string): T | null => {
    const mem = memory.get(key) as CacheEntry<T> | undefined;
    if (mem && !isExpired(mem)) return mem.value;
    if (mem && isExpired(mem)) memory.delete(key);

    const persisted = readFromSession<T>(key);
    if (!persisted) return null;
    if (isExpired(persisted)) {
      removeFromSession(key);
      return null;
    }

    memory.set(key, persisted as CacheEntry<unknown>);
    return persisted.value;
  };

  const set = <T>(key: string, value: T, ttlMs = 1000 * 60 * 5) => {
    const safeTtl = Math.max(0, ttlMs);
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now() + safeTtl,
    };

    memory.set(key, entry as CacheEntry<unknown>);
    writeToSession(key, entry);
    return value;
  };

  const has = (key: string) => get(key) !== null;

  const invalidate = (key: string) => {
    memory.delete(key);
    pending.delete(key);
    removeFromSession(key);
  };

  const clear = () => {
    memory.clear();
    pending.clear();

    if (!allowSessionFallback || !safeStorageAvailable()) return;
    try {
      const keysToDelete: string[] = [];
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const k = sessionStorage.key(i);
        if (!k) continue;
        if (k.startsWith(`${prefix}:`)) keysToDelete.push(k);
      }
      keysToDelete.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // silent fail
    }
  };

  const fetch = async <T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs = 1000 * 60 * 5,
  ): Promise<T> => {
    const cached = get<T>(key);
    if (cached !== null) return cached;

    const inflight = pending.get(key) as PendingPromise<T> | undefined;
    if (inflight) return inflight;

    const request = loader()
      .then((value) => {
        set(key, value, ttlMs);
        pending.delete(key);
        return value;
      })
      .catch((error) => {
        pending.delete(key);
        throw error;
      });

    pending.set(key, request as PendingPromise<unknown>);
    return request;
  };

  return {
    get,
    set,
    has,
    invalidate,
    clear,
    fetch,
  };
}

export const smartCache = createSmartCache();

// Backward-compatible API used by existing hooks
export function getSmartCache<T>(key: string, maxAgeMs: number): T | null {
  const val = smartCache.get<T>(key);
  if (val !== null) return val;

  // compat path: ensure old callers still receive null when missing/expired.
  // ttl is applied only on set in v2, so this branch loads from legacy format if present.
  try {
    if (!safeStorageAvailable()) return null;
    const legacyRaw = sessionStorage.getItem(`smart-cache:v1:${key}`);
    if (!legacyRaw) return null;
    const parsed = JSON.parse(legacyRaw) as { createdAt: number; value: T };
    if (!parsed?.createdAt) return null;
    if (now() - parsed.createdAt > maxAgeMs) {
      sessionStorage.removeItem(`smart-cache:v1:${key}`);
      return null;
    }

    smartCache.set(key, parsed.value, Math.max(0, maxAgeMs - (now() - parsed.createdAt)));
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function setSmartCache<T>(key: string, value: T, ttlMs = 1000 * 60 * 5) {
  return smartCache.set(key, value, ttlMs);
}

export function invalidateSmartCache(key: string) {
  smartCache.invalidate(key);
}

export function clearSmartCache() {
  smartCache.clear();
}

export function hasSmartCache(key: string) {
  return smartCache.has(key);
}

export function runApiMicrotask(task: () => void | Promise<void>) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(() => {
      void task();
    });
    return;
  }

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(() => {
      void task();
    });
    return;
  }

  globalThis.setTimeout(() => {
    void task();
  }, 0);
}

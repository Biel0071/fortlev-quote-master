type CachedValue<T> = {
  createdAt: number;
  value: T;
};

const CACHE_PREFIX = "smart-cache:v1";

function buildKey(key: string) {
  return `${CACHE_PREFIX}:${key}`;
}

export function getSmartCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(buildKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedValue<T>;
    if (!parsed?.createdAt) return null;

    if (Date.now() - parsed.createdAt > maxAgeMs) {
      sessionStorage.removeItem(buildKey(key));
      return null;
    }

    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function setSmartCache<T>(key: string, value: T) {
  try {
    const payload: CachedValue<T> = { createdAt: Date.now(), value };
    sessionStorage.setItem(buildKey(key), JSON.stringify(payload));
  } catch {
    // silent fail for private mode / storage disabled
  }
}

export function runApiMicrotask(task: () => void | Promise<void>) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(() => {
      void task();
    });
    return;
  }

  window.setTimeout(() => {
    void task();
  }, 0);
}

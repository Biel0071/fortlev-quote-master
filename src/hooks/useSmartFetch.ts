import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { smartCache } from "@/utils/smartCache";

type UseSmartFetchOptions<T> = {
  key: string;
  ttlMs?: number;
  enabled?: boolean;
  fetcher: (signal: AbortSignal) => Promise<T>;
};

type UseSmartFetchResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useSmartFetch<T>(options: UseSmartFetchOptions<T>): UseSmartFetchResult<T> {
  const { key, fetcher, ttlMs = 1000 * 60 * 5, enabled = true } = options;

  const [data, setData] = useState<T | null>(() => smartCache.get<T>(key));
  const [loading, setLoading] = useState<boolean>(enabled && !smartCache.has(key));
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (force = false) => {
      if (!enabled) return;

      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      const controller = new AbortController();
      controllerRef.current = controller;

      if (!force) {
        const cached = smartCache.get<T>(key);
        if (cached !== null) {
          setData(cached);
          setLoading(false);

          // stale-while-revalidate silencioso
          void smartCache
            .fetch<T>(
              `${key}:revalidate`,
              async () => {
                const fresh = await fetcher(controller.signal);
                smartCache.set(key, fresh, ttlMs);
                setData(fresh);
                return fresh;
              },
              1500,
            )
            .catch(() => undefined);

          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const result = await smartCache.fetch<T>(
          key,
          async () => {
            const fresh = await fetcher(controller.signal);
            return fresh;
          },
          ttlMs,
        );

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (e: unknown) {
        if (!controller.signal.aborted) {
          const message = e instanceof Error ? e.message : "Falha ao carregar";
          setError(message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [enabled, fetcher, key, ttlMs],
  );

  useEffect(() => {
    void execute();

    return () => {
      controllerRef.current?.abort();
    };
  }, [execute]);

  const refresh = useCallback(async () => {
    smartCache.invalidate(key);
    await execute(true);
  }, [execute, key]);

  return useMemo(
    () => ({ data, loading, error, refresh }),
    [data, loading, error, refresh],
  );
}

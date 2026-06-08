import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { getSmartCache, runApiMicrotask, setSmartCache } from "@/utils/smartCache";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function topIdsFromCounts(counts: Map<string, number>, limit: number) {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

function aggregateCounts<T extends { product_id: string | null }>(rows: T[], weight?: (row: T) => number) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const pid = r.product_id;
    if (!pid) continue;
    const w = weight ? weight(r) : 1;
    m.set(pid, (m.get(pid) ?? 0) + (Number.isFinite(w) ? w : 0));
  }
  return m;
}

function interleaveUnique(lists: string[][], limit: number) {
  const out: string[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (out.length < limit) {
    let progressed = false;
    for (const list of lists) {
      const id = list[i];
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
        progressed = true;
        if (out.length >= limit) break;
      }
    }
    if (!progressed) break;
    i += 1;
  }
  return out;
}

const MERCH_CACHE_KEY = "home_merchandising:v1";
const MERCH_CACHE_TTL_MS = 1000 * 60 * 3;

type MerchCache = {
  weeklyPicks: string[];
  weeklyBadges: Record<string, string>;
  monthlyTopSales: string[];
};

type UseHomeMerchandisingOptions = {
  enabled?: boolean;
};

export function useHomeMerchandising(options?: UseHomeMerchandisingOptions) {
  const { store } = useTenant();
  const enabled = (options?.enabled ?? true) && !!store;
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const [weeklyPicks, setWeeklyPicks] = useState<string[]>([]);
  const [weeklyBadges, setWeeklyBadges] = useState<Record<string, string>>({});
  const [monthlyTopSales, setMonthlyTopSales] = useState<string[]>([]);

  const STORE_MERCH_CACHE_KEY = useMemo(() => `${MERCH_CACHE_KEY}:${store?.id ?? 'default'}`, [store?.id]);

  useEffect(() => {
    if (!enabled || !store) {
      setLoading(false);
      return;
    }

    let alive = true;

    const load = async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);

      const sinceWeek = isoDaysAgo(7);
      const sinceMonth = isoDaysAgo(30);

      const [viewsRes, weekItemsRes, monthItemsRes] = await Promise.all([
        cloud
          .from("tracking_events")
          .select("product_id, created_at, type")
          .eq("type", "product_view")
          .eq("store_id", store.id)
          .gte("created_at", sinceWeek)
          .limit(200),
        cloud
          .from("store_order_items")
          .select("product_id, quantity, created_at")
          .eq("store_id", store.id)
          .gte("created_at", sinceWeek)
          .limit(200),
        cloud
          .from("store_order_items")
          .select("product_id, quantity, created_at")
          .eq("store_id", store.id)
          .gte("created_at", sinceMonth)
          .limit(200),
      ]);

      const firstError = viewsRes.error || weekItemsRes.error || monthItemsRes.error;
      if (firstError) {
        if (!alive) return;
        setError(firstError.message);
        setWeeklyPicks([]);
        setWeeklyBadges({});
        setMonthlyTopSales([]);
        setLoading(false);
        return;
      }

      const viewCounts = aggregateCounts((viewsRes.data ?? []) as any[]);
      const weeklyOrderCounts = aggregateCounts((weekItemsRes.data ?? []) as any[], (r: any) => Number(r.quantity ?? 0));
      const monthlySalesCounts = aggregateCounts((monthItemsRes.data ?? []) as any[], (r: any) => Number(r.quantity ?? 0));

      const topViewed = topIdsFromCounts(viewCounts, 8);
      const topOrdered = topIdsFromCounts(weeklyOrderCounts, 8);
      const topSoldMonthly = topIdsFromCounts(monthlySalesCounts, 8);

      const weekly = interleaveUnique([topViewed, topOrdered, topSoldMonthly], 8);

      const badges: Record<string, string> = {};
      for (const id of weekly) {
        if (topViewed.includes(id)) badges[id] = "Mais visto";
        if (topOrdered.includes(id)) badges[id] = "Gerou pedidos";
        if (topSoldMonthly.includes(id)) badges[id] = badges[id] ? badges[id] : "Mais vendido";
      }

      if (!alive) return;
      setWeeklyPicks(weekly);
      setWeeklyBadges(badges);
      setMonthlyTopSales(topSoldMonthly.slice(0, 8));
      setSmartCache<MerchCache>(
        STORE_MERCH_CACHE_KEY,
        {
          weeklyPicks: weekly,
          weeklyBadges: badges,
          monthlyTopSales: topSoldMonthly.slice(0, 8),
        },
        MERCH_CACHE_TTL_MS,
      );
      setLoading(false);
    };

    const cached = getSmartCache<MerchCache>(STORE_MERCH_CACHE_KEY, MERCH_CACHE_TTL_MS);
    if (cached) {
      setWeeklyPicks(cached.weeklyPicks ?? []);
      setWeeklyBadges(cached.weeklyBadges ?? {});
      setMonthlyTopSales(cached.monthlyTopSales ?? []);
      setLoading(false);
      runApiMicrotask(() => load({ silent: true }));
    } else {
      void load();
    }

    return () => {
      alive = false;
    };
  }, [enabled, store?.id, STORE_MERCH_CACHE_KEY]);

  return useMemo(
    () => ({ loading, error, weeklyPicks, weeklyBadges, monthlyTopSales }),
    [loading, error, weeklyPicks, weeklyBadges, monthlyTopSales],
  );
}

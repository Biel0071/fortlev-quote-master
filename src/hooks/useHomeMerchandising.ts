import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";

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

export function useHomeMerchandising() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [weeklyPicks, setWeeklyPicks] = useState<string[]>([]);
  const [weeklyBadges, setWeeklyBadges] = useState<Record<string, string>>({});
  const [monthlyTopSales, setMonthlyTopSales] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const sinceWeek = isoDaysAgo(7);
      const sinceMonth = isoDaysAgo(30);

      const [viewsRes, weekItemsRes, monthItemsRes] = await Promise.all([
        cloud
          .from("visitor_events")
          .select("product_id, created_at, event_name")
          .eq("event_name", "product_view")
          .gte("created_at", sinceWeek)
          .limit(1000),
        cloud
          .from("store_order_items")
          .select("product_id, quantity, created_at")
          .gte("created_at", sinceWeek)
          .limit(1000),
        cloud
          .from("store_order_items")
          .select("product_id, quantity, created_at")
          .gte("created_at", sinceMonth)
          .limit(1000),
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

      // Weekly picks: interleave to keep variety in the first 8 slots.
      const weekly = interleaveUnique([topViewed, topOrdered, topSoldMonthly], 8);

      const badges: Record<string, string> = {};
      for (const id of weekly) {
        if (topViewed.includes(id)) badges[id] = "Mais visto";
        if (topOrdered.includes(id)) badges[id] = "Gerou pedidos";
        // monthly is a good proxy for best sellers when weekly is noisy
        if (topSoldMonthly.includes(id)) badges[id] = badges[id] ? badges[id] : "Mais vendido";
      }

      if (!alive) return;
      setWeeklyPicks(weekly);
      setWeeklyBadges(badges);
      setMonthlyTopSales(topSoldMonthly.slice(0, 8));
      setLoading(false);
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(
    () => ({ loading, error, weeklyPicks, weeklyBadges, monthlyTopSales }),
    [loading, error, weeklyPicks, weeklyBadges, monthlyTopSales],
  );
}

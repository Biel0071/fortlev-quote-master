import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { computeLeadPropensity } from "@/modules/tracking/scoreEngine";

type DashboardInsights = {
  summary: {
    salesToday: number;
    salesWeek: number;
    ticketAverage: number;
    onlineUsers: number;
    hotUsers: number;
    pendingQuotations: number;
    abandonedCarts: number;
  };
  charts: {
    salesDaily: Array<{ date: string; total: number }>;
    intentDaily: Array<{ date: string; score: number }>;
    conversionFunnel: Array<{ stage: string; value: number }>;
    intentHeatmap: Array<{ hour: string; score: number }>;
  };
  lists: {
    onlineNow: Array<{ session_id: string; score: number; status: string; device: string; source: string; last_seen_at: string }>;
    hotLeads: Array<{ session_id: string; score: number; status: string; device: string; source: string; last_seen_at: string }>;
    recentActivity: Array<{ session_id: string; type: string; created_at: string; metadata: Record<string, unknown> }>;
    liveActions: Array<{ session_id: string; type: string; created_at: string; metadata: Record<string, unknown> }>;
    abandonedCarts: Array<{ id: string; session_id: string; total: number; updated_at: string; recovery_status: string }>;
    topViewedProducts: Array<{ id: string; name: string; views: number }>;
    topSearchTerms: Array<{ term: string; count: number }>;
  };
  intelligence: {
    conversionRate: number;
    abandonmentRate: number;
    avgTimeOnSite: number;
  };
  generated_at: string;
};

const EMPTY: DashboardInsights = {
  summary: { salesToday: 0, salesWeek: 0, ticketAverage: 0, onlineUsers: 0, hotUsers: 0, pendingQuotations: 0, abandonedCarts: 0 },
  charts: { salesDaily: [], intentDaily: [], conversionFunnel: [], intentHeatmap: [] },
  lists: { onlineNow: [], hotLeads: [], recentActivity: [], liveActions: [], abandonedCarts: [], topViewedProducts: [], topSearchTerms: [] },
  intelligence: { conversionRate: 0, abandonmentRate: 0, avgTimeOnSite: 0 },
  generated_at: "",
};

type RawSessionRow = {
  id: string;
  session_token: string;
  score: number | null;
  temperature: string | null;
  purchase_probability?: number | null;
  lead_quality?: string | null;
  total_time_seconds?: number | null;
  site_time_seconds?: number | null;
  app_time_seconds?: number | null;
  total_pages?: number | null;
  encrypted_clicks?: number | null;
  product_views?: number | null;
  cart_actions?: number | null;
  return_visits?: number | null;
  scroll_depth?: number | null;
  is_bot?: boolean | null;
  device: string | null;
  source: string | null;
  last_seen_at: string | null;
};

type RawEventRow = {
  session_id: string;
  type: string;
  product_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function useAdminDashboardInsights() {
  const { activeStoreId } = useStore();
  const [data, setData] = useState<DashboardInsights>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async (silent = false) => {
      if (!activeStoreId) {
        if (!silent) setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      setError(null);

      try {
        const [sessionsRes, eventsRes, ordersRes, productsRes] = await Promise.all([
          cloud
            .from("tracking_sessions")
            .select(
              "id, session_token, score, temperature, purchase_probability, lead_quality, total_time_seconds, site_time_seconds, app_time_seconds, total_pages, encrypted_clicks, product_views, cart_actions, return_visits, scroll_depth, is_bot, device, source, last_seen_at",
            )
            .or(`store_id.eq.${activeStoreId},store_id.is.null`)
            .order("last_seen_at", { ascending: false })
            .limit(500),
          cloud
            .from("tracking_events")
            .select("session_id, type, product_id, metadata, created_at")
            .or(`store_id.eq.${activeStoreId},store_id.is.null`)
            .order("created_at", { ascending: false })
            .limit(1000),
          cloud
            .from("store_orders")
            .select("id, total, status, created_at")
            .eq("store_id", activeStoreId)
            .order("created_at", { ascending: false })
            .limit(300),
          cloud
            .from("products")
            .select("id, name")
            .eq("store_id", activeStoreId)
            .limit(500),
        ]);

        if (!alive) return;
        if (sessionsRes.error) throw sessionsRes.error;

        const sessions = ((sessionsRes.data ?? []) as RawSessionRow[]).filter((s) => !s.is_bot);
        const events = (eventsRes.data ?? []) as RawEventRow[];
        const orders = (ordersRes.data ?? []) as Array<{ id: string; total: number | null; status: string | null; created_at: string }>;
        const productNameMap = new Map<string, string>(
          ((productsRes.data ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]),
        );

        const nowMs = Date.now();
        const startOfTodayMs = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
        const sevenDaysAgoMs = nowMs - 7 * 86400_000;

        let salesToday = 0;
        let salesWeek = 0;
        let paidCount = 0;
        let paidSum = 0;
        for (const o of orders) {
          const isPaid = /pago|paid|aprovad|entregue|conclu[ií]d|confirmad|enviad|transito|finalizad/i.test(o.status || "");
          if (!isPaid) continue;
          const val = Number(o.total || 0);
          paidCount += 1;
          paidSum += val;
          const ts = new Date(o.created_at).getTime();
          if (ts >= startOfTodayMs) salesToday += val;
          if (ts >= sevenDaysAgoMs) salesWeek += val;
        }

        const totalTimeSum = sessions.reduce((acc, s) => acc + (s.total_time_seconds ?? 0), 0);
        const avgTimeOnSite = sessions.length > 0 ? totalTimeSum / sessions.length : 0;

        const productCountMap = new Map<string, number>();
        const searchMap = new Map<string, number>();
        let checkouts = 0;
        let purchases = 0;

        for (const ev of events) {
          if (ev.type === "product_view" && ev.product_id) {
            productCountMap.set(ev.product_id, (productCountMap.get(ev.product_id) ?? 0) + 1);
          } else if (ev.type === "search") {
            const q = String((ev.metadata as Record<string, unknown> | null)?.term ?? (ev.metadata as Record<string, unknown> | null)?.query ?? "").trim();
            if (q) searchMap.set(q, (searchMap.get(q) ?? 0) + 1);
          } else if (ev.type === "checkout_start") {
            checkouts += 1;
          } else if (ev.type === "purchase" || ev.type === "request_quote") {
            purchases += 1;
          }
        }

        const conversionRate = sessions.length > 0 ? ((purchases + paidCount) / sessions.length) * 100 : 0;
        const abandonmentRate = checkouts > 0 ? Math.max(0, ((checkouts - purchases) / checkouts) * 100) : 0;

        const scoredLeads = sessions.map((s) => {
          const calc = computeLeadPropensity({
            siteTimeSeconds: s.site_time_seconds ?? s.total_time_seconds ?? 0,
            appTimeSeconds: s.app_time_seconds ?? 0,
            totalPages: s.total_pages ?? 0,
            encryptedClicks: s.encrypted_clicks ?? 0,
            scrollDepth: s.scroll_depth ?? 0,
            productViews: s.product_views ?? 0,
            cartActions: s.cart_actions ?? 0,
            returnVisits: s.return_visits ?? 1,
            isBot: Boolean(s.is_bot),
          });
          const prob = Math.max(s.purchase_probability ?? 0, calc.probability);
          return {
            session_id: s.session_token,
            score: prob,
            status: s.lead_quality || calc.leadQuality,
            device: s.device || "web",
            source: s.source || "direct",
            last_seen_at: s.last_seen_at || new Date().toISOString(),
          };
        });

        const onlineNow = scoredLeads.filter((l) => nowMs - new Date(l.last_seen_at).getTime() <= 5 * 60_000);
        const hotLeads = scoredLeads
          .filter((l) => l.score >= 65)
          .sort((a, b) => b.score - a.score)
          .slice(0, 20);

        const topViewedProducts = [...productCountMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id, views]) => ({
            id,
            name: productNameMap.get(id) ?? `Produto #${id.slice(0, 8)}`,
            views,
          }));

        const topSearchTerms = [...searchMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([term, count]) => ({ term, count }));

        setData({
          ...EMPTY,
          summary: {
            salesToday,
            salesWeek,
            ticketAverage: paidCount > 0 ? paidSum / paidCount : 0,
            onlineUsers: onlineNow.length,
            hotUsers: hotLeads.length,
            pendingQuotations: 0,
            abandonedCarts: Math.max(0, checkouts - purchases),
          },
          lists: {
            ...EMPTY.lists,
            onlineNow,
            hotLeads,
            recentActivity: events.slice(0, 30).map((ev) => ({
              session_id: ev.session_id,
              type: ev.type,
              created_at: ev.created_at,
              metadata: ev.metadata ?? {},
            })),
            topViewedProducts,
            topSearchTerms,
          },
          intelligence: {
            conversionRate: Math.min(100, conversionRate),
            abandonmentRate: Math.min(100, abandonmentRate),
            avgTimeOnSite,
          },
          generated_at: new Date().toISOString(),
        });
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar análises");
      } finally {
        if (alive && !silent) setLoading(false);
      }
    };

    void load(false);
    const interval = window.setInterval(() => void load(true), 15_000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [activeStoreId]);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}

import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";

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

export function useAdminDashboardInsights() {
  const [data, setData] = useState<DashboardInsights>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      const { data: response, error } = await cloud.functions.invoke("admin-dashboard-insights");
      if (!alive) return;
      if (error) {
        setError(error.message);
        if (!silent) setLoading(false);
        return;
      }
      setData({
        ...EMPTY,
        ...(response ?? {}),
        summary: { ...EMPTY.summary, ...((response as any)?.summary ?? {}) },
        charts: { ...EMPTY.charts, ...((response as any)?.charts ?? {}) },
        lists: { ...EMPTY.lists, ...((response as any)?.lists ?? {}) },
        intelligence: { ...EMPTY.intelligence, ...((response as any)?.intelligence ?? {}) },
      } as DashboardInsights);
      setLoading(false);
    };

    void load(false);
    const interval = window.setInterval(() => void load(true), 10000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}

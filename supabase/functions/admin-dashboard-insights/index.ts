import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function startOfDayISO(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeekISO(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Backend secrets missing");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: isAdmin, error: adminErr } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (adminErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const todayISO = startOfDayISO(now);
    const weekISO = startOfWeekISO(now);
    const onlineCutoff = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [
      salesTodayRes,
      salesWeekRes,
      paidOrdersRes,
      onlineUsersRes,
      hotUsersRes,
      pendingQuoteEventsRes,
      sessionSummaryRes,
      dailySalesRes,
      weekEventsRes,
      recentEventsRes,
      abandonedRes,
      totalSessionsRes,
      convertedSessionsRes,
      recentCheckoutSessionsRes,
    ] = await Promise.all([
      service.from("store_orders").select("total").in("status", ["pago", "finalizado"]).gte("created_at", todayISO).limit(2000),
      service.from("store_orders").select("total").in("status", ["pago", "finalizado"]).gte("created_at", weekISO).limit(4000),
      service.from("store_orders").select("id", { count: "exact", head: true }).in("status", ["pago", "finalizado"]),
      service.from("tracking_sessions").select("session_token, score, temperature, last_seen_at, device, source").gte("last_seen_at", onlineCutoff).order("last_seen_at", { ascending: false }).limit(30),
      service.from("tracking_sessions").select("session_token, score, temperature, last_seen_at, device, source").eq("temperature", "quente").order("score", { ascending: false }).limit(20),
      service.from("tracking_events").select("id", { count: "exact", head: true }).eq("type", "request_quote").gte("created_at", weekISO),
      service.from("tracking_sessions").select("total_time_seconds, total_pages, total_clicks, score").limit(2000),
      service.from("store_orders").select("created_at, total, status").in("status", ["pago", "finalizado"]).gte("created_at", weekISO).limit(4000),
      service.from("tracking_events").select("type, metadata, created_at, session_id, product_id").gte("created_at", weekISO).order("created_at", { ascending: false }).limit(8000),
      service.from("tracking_events").select("type, metadata, created_at, session_id").gte("created_at", recentCutoff).order("created_at", { ascending: false }).limit(200),
      service.from("abandoned_checkouts").select("id, session_id, total, updated_at, recovery_status").eq("recovery_status", "open").order("updated_at", { ascending: false }).limit(20),
      service.from("tracking_sessions").select("id", { count: "exact", head: true }).gte("first_seen_at", weekISO),
      service.from("store_orders").select("id", { count: "exact", head: true }).in("status", ["pago", "finalizado"]).gte("created_at", weekISO),
      service.from("checkout_sessions").select("id", { count: "exact", head: true }).gte("created_at", weekISO),
    ]);

    const salesToday = (salesTodayRes.data ?? []).reduce((acc, row: any) => acc + Number(row.total ?? 0), 0);
    const salesWeek = (salesWeekRes.data ?? []).reduce((acc, row: any) => acc + Number(row.total ?? 0), 0);
    const paidOrdersCount = paidOrdersRes.count ?? 0;
    const ticketAverage = paidOrdersCount > 0 ? salesWeek / paidOrdersCount : 0;

    const allSessions = sessionSummaryRes.data ?? [];
    const avgTimeOnSite = allSessions.length > 0
      ? Math.round(allSessions.reduce((acc: number, s: any) => acc + Number(s.total_time_seconds ?? 0), 0) / allSessions.length)
      : 0;

    const conversionRate = (totalSessionsRes.count ?? 0) > 0
      ? ((convertedSessionsRes.count ?? 0) / (totalSessionsRes.count ?? 1)) * 100
      : 0;

    const abandonmentRate = (recentCheckoutSessionsRes.count ?? 0) > 0
      ? ((abandonedRes.data?.length ?? 0) / (recentCheckoutSessionsRes.count ?? 1)) * 100
      : 0;

    const salesDailyMap = new Map<string, number>();
    for (const row of dailySalesRes.data ?? []) {
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      salesDailyMap.set(key, (salesDailyMap.get(key) ?? 0) + Number(row.total ?? 0));
    }

    const intentDailyMap = new Map<string, number>();
    const intentHeatMap = new Map<string, number>();
    const topProductMap = new Map<string, number>();
    const searchTermsMap = new Map<string, number>();

    const sessionsWithProductView = new Set<string>();
    const sessionsWithAddToCart = new Set<string>();
    const sessionsWithCheckoutStart = new Set<string>();
    const sessionsWithRequestQuote = new Set<string>();

    for (const row of weekEventsRes.data ?? []) {
      const dateKey = new Date(row.created_at).toISOString().slice(0, 10);
      const hourKey = new Date(row.created_at).getHours().toString().padStart(2, "0");
      const delta = Number((row.metadata as any)?.score_delta ?? 0);

      intentDailyMap.set(dateKey, (intentDailyMap.get(dateKey) ?? 0) + Math.max(0, delta));
      intentHeatMap.set(hourKey, (intentHeatMap.get(hourKey) ?? 0) + Math.max(0, delta));

      const sid = String(row.session_id ?? "");
      if (row.type === "product_view") {
        if (sid) sessionsWithProductView.add(sid);
        const pid = String(row.product_id ?? "").trim();
        if (pid) topProductMap.set(pid, (topProductMap.get(pid) ?? 0) + 1);
      }
      if (row.type === "add_to_cart" && sid) sessionsWithAddToCart.add(sid);
      if (row.type === "checkout_start" && sid) sessionsWithCheckoutStart.add(sid);
      if (row.type === "request_quote" && sid) sessionsWithRequestQuote.add(sid);
      if (row.type === "search") {
        const term = String((row.metadata as any)?.term ?? (row.metadata as any)?.query ?? "").trim().toLowerCase();
        if (term) searchTermsMap.set(term, (searchTermsMap.get(term) ?? 0) + 1);
      }
    }

    const topProductIds = Array.from(topProductMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
    const { data: topProductsData } = topProductIds.length > 0
      ? await service.from("store_products").select("id, name").in("id", topProductIds)
      : { data: [] };

    const namesById = new Map((topProductsData ?? []).map((p: any) => [p.id, p.name]));
    const topViewedProducts = topProductIds.map((id) => ({ id, name: namesById.get(id) ?? "Produto", views: topProductMap.get(id) ?? 0 }));

    const topSearchTerms = Array.from(searchTermsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));

    const recentActivity = (recentEventsRes.data ?? []).slice(0, 25).map((e: any) => ({
      session_id: String(e.session_id ?? ""),
      type: e.type,
      created_at: e.created_at,
      metadata: e.metadata ?? {},
    }));

    const conversionFunnel = [
      { stage: "Sessões", value: Number(totalSessionsRes.count ?? 0) },
      { stage: "Visualizou", value: sessionsWithProductView.size },
      { stage: "Carrinho", value: sessionsWithAddToCart.size },
      { stage: "Checkout", value: sessionsWithCheckoutStart.size },
      { stage: "Orçamento", value: sessionsWithRequestQuote.size },
    ];

    const payload = {
      summary: {
        salesToday,
        salesWeek,
        ticketAverage,
        onlineUsers: (onlineUsersRes.data ?? []).length,
        hotUsers: (hotUsersRes.data ?? []).length,
        pendingQuotations: pendingQuoteEventsRes.count ?? 0,
        abandonedCarts: (abandonedRes.data ?? []).length,
      },
      charts: {
        salesDaily: Array.from(salesDailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, total]) => ({ date, total })),
        intentDaily: Array.from(intentDailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, score]) => ({ date, score })),
        conversionFunnel,
        intentHeatmap: Array.from(intentHeatMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([hour, score]) => ({ hour: `${hour}:00`, score })),
      },
      lists: {
        onlineNow: (onlineUsersRes.data ?? []).map((s: any) => ({
          session_id: s.session_token,
          score: Number(s.score ?? 0),
          status: s.temperature,
          device: s.device,
          source: s.source,
          last_seen_at: s.last_seen_at,
        })),
        hotLeads: (hotUsersRes.data ?? []).map((s: any) => ({
          session_id: s.session_token,
          score: Number(s.score ?? 0),
          status: s.temperature,
          device: s.device,
          source: s.source,
          last_seen_at: s.last_seen_at,
        })),
        recentActivity,
        liveActions: recentActivity.slice(0, 10),
        abandonedCarts: (abandonedRes.data ?? []).map((c: any) => ({
          id: c.id,
          session_id: c.session_id,
          total: Number(c.total ?? 0),
          updated_at: c.updated_at,
          recovery_status: c.recovery_status,
        })),
        topViewedProducts,
        topSearchTerms,
      },
      intelligence: {
        conversionRate,
        abandonmentRate,
        avgTimeOnSite,
      },
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=15" },
    });
  } catch (e) {
    console.error("admin-dashboard-insights error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

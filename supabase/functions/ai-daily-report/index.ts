import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const todayStart = `${today}T00:00:00Z`;
    const todayEnd = `${today}T23:59:59Z`;
    const yesterdayStart = `${yesterday}T00:00:00Z`;
    const yesterdayEnd = `${yesterday}T23:59:59Z`;

    // Collect metrics
    const [
      { count: visitorsToday },
      { count: visitorsYesterday },
      { data: sessionsToday },
      { data: ordersToday },
      { data: ordersYesterday },
      { data: topViewed },
      { data: recentEvents },
      { data: abandonedToday },
    ] = await Promise.all([
      sb.from("tracking_sessions").select("*", { count: "exact", head: true }).gte("first_seen_at", todayStart).lte("first_seen_at", todayEnd),
      sb.from("tracking_sessions").select("*", { count: "exact", head: true }).gte("first_seen_at", yesterdayStart).lte("first_seen_at", yesterdayEnd),
      sb.from("tracking_sessions").select("score,total_time_seconds,total_pages,source,device").gte("first_seen_at", todayStart),
      sb.from("store_orders").select("total,subtotal").gte("created_at", todayStart).lte("created_at", todayEnd),
      sb.from("store_orders").select("total").gte("created_at", yesterdayStart).lte("created_at", yesterdayEnd),
      sb.from("store_products").select("id,name,views").order("views", { ascending: false }).limit(10),
      sb.from("tracking_events").select("type,product_id").gte("created_at", todayStart).limit(500),
      sb.from("abandoned_checkouts").select("id").gte("created_at", todayStart).eq("recovery_status", "open"),
    ]);

    const sessions = sessionsToday || [];
    const orders = ordersToday || [];
    const ordersYest = ordersYesterday || [];

    // Calculate metrics
    const uniqueVisitors = visitorsToday || 0;
    const uniqueVisitorsYesterday = visitorsYesterday || 0;
    const trafficChange = uniqueVisitorsYesterday > 0
      ? Math.round(((uniqueVisitors - uniqueVisitorsYesterday) / uniqueVisitorsYesterday) * 100)
      : 0;

    const avgTime = sessions.length > 0
      ? Math.round(sessions.reduce((s, x) => s + (x.total_time_seconds || 0), 0) / sessions.length)
      : 0;

    const avgPages = sessions.length > 0
      ? Math.round((sessions.reduce((s, x) => s + (x.total_pages || 0), 0) / sessions.length) * 10) / 10
      : 0;

    const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalSalesYesterday = ordersYest.reduce((s, o) => s + (o.total || 0), 0);
    const ticketMedio = orders.length > 0 ? Math.round(totalSales / orders.length) : 0;

    const hotLeads = sessions.filter((s) => (s.score || 0) >= 71).length;
    const warmLeads = sessions.filter((s) => (s.score || 0) >= 31 && (s.score || 0) < 71).length;
    const coldLeads = sessions.filter((s) => (s.score || 0) < 31).length;

    // Source breakdown
    const sources: Record<string, number> = {};
    sessions.forEach((s) => { sources[s.source || "direct"] = (sources[s.source || "direct"] || 0) + 1; });

    // Device breakdown
    const devices: Record<string, number> = {};
    sessions.forEach((s) => { devices[s.device || "unknown"] = (devices[s.device || "unknown"] || 0) + 1; });

    // Product views from events
    const productViews: Record<string, number> = {};
    (recentEvents || []).forEach((e) => {
      if (e.type === "product_view" && e.product_id) {
        productViews[e.product_id] = (productViews[e.product_id] || 0) + 1;
      }
    });

    const metrics = {
      visitors: {
        unique_today: uniqueVisitors,
        unique_yesterday: uniqueVisitorsYesterday,
        traffic_change_pct: trafficChange,
      },
      behavior: {
        avg_time_seconds: avgTime,
        avg_pages: avgPages,
        sources,
        devices,
      },
      conversion: {
        orders_today: orders.length,
        orders_yesterday: ordersYest.length,
        total_sales: totalSales,
        total_sales_yesterday: totalSalesYesterday,
        ticket_medio: ticketMedio,
        abandoned_carts: (abandonedToday || []).length,
      },
      leads: {
        hot: hotLeads,
        warm: warmLeads,
        cold: coldLeads,
      },
      top_products: (topViewed || []).slice(0, 5).map((p) => ({ name: p.name, views: p.views })),
    };

    // Generate AI analysis
    let analysisText = "";
    const alerts: string[] = [];
    const suggestions: string[] = [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Você é um analista de e-commerce de materiais de construção. Gere um relatório diário conciso em português.
Responda em JSON: {"resumo": "texto", "alertas": ["..."], "sugestoes": ["..."]}`,
              },
              {
                role: "user",
                content: `Métricas de hoje (${today}):\n${JSON.stringify(metrics, null, 2)}`,
              },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              analysisText = parsed.resumo || "";
              if (parsed.alertas) alerts.push(...parsed.alertas);
              if (parsed.sugestoes) suggestions.push(...parsed.sugestoes);
            } catch {
              analysisText = content.slice(0, 500);
            }
          } else {
            analysisText = content.slice(0, 500);
          }
        } else {
          await aiResp.text();
        }
      } catch (e) {
        console.error("AI report error:", e);
      }
    }

    if (!analysisText) {
      analysisText = `Hoje o site recebeu ${uniqueVisitors} visitantes únicos. `;
      if (trafficChange > 0) analysisText += `Tráfego aumentou ${trafficChange}% comparado ao dia anterior. `;
      else if (trafficChange < 0) analysisText += `Tráfego caiu ${Math.abs(trafficChange)}% comparado ao dia anterior. `;
      analysisText += `Foram ${orders.length} pedidos com ticket médio de R$ ${ticketMedio}. `;
      analysisText += `${hotLeads} leads quentes, ${warmLeads} mornos e ${coldLeads} frios.`;
    }

    // Save report
    const { error: saveErr } = await sb.from("ai_system_reports").upsert({
      report_date: today,
      metrics_json: metrics,
      analysis_text: analysisText,
      alerts,
      suggestions,
      comparison_json: {
        visitors_change: trafficChange,
        sales_change: totalSalesYesterday > 0
          ? Math.round(((totalSales - totalSalesYesterday) / totalSalesYesterday) * 100)
          : 0,
      },
    }, { onConflict: "report_date" });

    if (saveErr) console.error("Save report error:", saveErr);

    // Log to system_memory
    await sb.from("system_memory").insert({
      event: "daily_report_generated",
      entity: "ai_system_reports",
      entity_id: today,
      impact: "low",
      details: { visitors: uniqueVisitors, orders: orders.length, sales: totalSales },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        date: today,
        metrics,
        analysis: analysisText,
        alerts,
        suggestions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-daily-report error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

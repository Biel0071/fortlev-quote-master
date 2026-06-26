import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-api-key") ?? "";
    const ip = req.headers.get("x-forwarded-for") ?? null;
    const ua = req.headers.get("user-agent") ?? null;
    const url = new URL(req.url);
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: gate, error: gateErr } = await sb.rpc("api_consume_key", {
      _raw_key: apiKey,
      _endpoint: "/api-quotations",
      _method: req.method,
      _scope: "quotation:read",
      _ip: ip,
      _user_agent: ua,
    });
    if (gateErr) return json({ error: gateErr.message }, 500);
    const g = (gate as any)?.[0];
    if (!g?.ok) return json({ error: g?.message ?? "Unauthorized" }, g?.status_code ?? 401);

    const storeId = g.store_id as string;
    const type = (url.searchParams.get("type") ?? "fortlev").toLowerCase();
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;
    const status = url.searchParams.get("status");

    const table = type === "construction" ? "construction_quotations" : "fortlev_quotations";
    let q = sb.from(table).select("*").eq("store_id", storeId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, type, count: data?.length ?? 0, data });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

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
    const id = url.searchParams.get("id");
    const type = (url.searchParams.get("type") ?? "fortlev").toLowerCase();
    if (!id) return json({ error: "id obrigatório" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: gate, error: gateErr } = await sb.rpc("api_consume_key", {
      _raw_key: apiKey,
      _endpoint: "/api-quotation-pdf",
      _method: req.method,
      _scope: "danfe:read",
      _ip: ip,
      _user_agent: ua,
    });
    if (gateErr) return json({ error: gateErr.message }, 500);
    const g = (gate as any)?.[0];
    if (!g?.ok) return json({ error: g?.message ?? "Unauthorized" }, g?.status_code ?? 401);

    const table = type === "construction" ? "construction_quotations" : "fortlev_quotations";
    const { data: row, error } = await sb.from(table).select("*").eq("id", id).eq("store_id", g.store_id).maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!row) return json({ error: "Orçamento não encontrado" }, 404);

    const pdfUrl = (row as any).pdf_url ?? (row as any).fiscal?.xmlContent ?? null;
    if (!pdfUrl) {
      return json({ ok: true, quotation: row, pdf_url: null, message: "Sem PDF/DANFE armazenado para este orçamento" });
    }
    return json({ ok: true, id, type, pdf_url: pdfUrl, quotation: row });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

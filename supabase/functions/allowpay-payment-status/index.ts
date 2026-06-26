import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = Deno.env.get("ALLOWPAY_API_URL") || "https://allow-gi0i.onrender.com";

const STATUS_MAP: Record<string, string> = {
  waiting_payment: "pending",
  approved: "approved",
  expired: "failed",
  declined: "failed",
  canceled: "failed",
  refunded: "refunded",
  chargeback: "failed",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("ALLOWPAY_API_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const paymentId = body.payment_id;
    const transactionId = body.transaction_id;
    let route = body.route as string | undefined;

    if (!paymentId && !transactionId) {
      return new Response(JSON.stringify({ error: "payment_id ou transaction_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let externalId = paymentId;
    if (!externalId && transactionId) {
      const { data: tx } = await sb
        .from("payment_transactions")
        .select("external_id, metadata_json")
        .eq("id", transactionId)
        .single();
      externalId = tx?.external_id;
      if (!route) route = (tx?.metadata_json as any)?.route;
    } else if (!route && externalId) {
      const { data: tx } = await sb
        .from("payment_transactions")
        .select("metadata_json")
        .eq("external_id", externalId)
        .single();
      route = (tx?.metadata_json as any)?.route;
    }

    if (!externalId) {
      return new Response(JSON.stringify({ error: "Pagamento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!route) {
      return new Response(JSON.stringify({ error: "Route não encontrada para este pagamento" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = `${API_BASE}/api/v2/allowpay-seller/payment-status/${externalId}?route=${encodeURIComponent(route)}`;
    const startMs = Date.now();
    const apiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const durationMs = Date.now() - startMs;
    let resBody: any = {};
    try { resBody = await apiRes.json(); } catch { /* ignore */ }

    try {
      await sb.from("payment_logs").insert({
        direction: "outbound",
        method: "POST",
        url,
        request_body: { payment_id: externalId, route },
        response_body: resBody,
        status_code: apiRes.status,
        duration_ms: durationMs,
      });
    } catch { /* ignore */ }

    const rawStatus = resBody?.status || "unknown";
    const mapped = STATUS_MAP[rawStatus] || rawStatus;

    try {
      const q = sb.from("payment_transactions").update({ status: mapped });
      if (transactionId) await q.eq("id", transactionId);
      else await q.eq("external_id", externalId);
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ payment_id: externalId, status: rawStatus, mapped_status: mapped, details: resBody }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("allowpay-payment-status error:", err);
    return new Response(JSON.stringify({ error: "Erro ao consultar status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

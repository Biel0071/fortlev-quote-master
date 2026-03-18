import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_URL = "https://app.allowpay.online/api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("ALLOWPAY_API_KEY")!;

  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const paymentId = body.payment_id || url.searchParams.get("payment_id");
    const transactionId = body.transaction_id || url.searchParams.get("transaction_id");

    if (!paymentId && !transactionId) {
      return new Response(
        JSON.stringify({ error: "payment_id ou transaction_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let externalId = paymentId;

    // If only transaction_id provided, look up external_id
    if (!externalId && transactionId) {
      const { data: tx } = await sb
        .from("payment_transactions")
        .select("external_id")
        .eq("id", transactionId)
        .single();
      externalId = tx?.external_id;
    }

    if (!externalId) {
      return new Response(
        JSON.stringify({ error: "Pagamento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startMs = Date.now();
    const apiRes = await fetch(`${API_URL}/payments/${externalId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const durationMs = Date.now() - startMs;

    let resBody: Record<string, unknown> = {};
    try {
      resBody = await apiRes.json();
    } catch {
      resBody = {};
    }

    try {
      await sb.from("payment_logs").insert({
        direction: "outbound",
        method: "GET",
        url: `${API_URL}/payments/${externalId}`,
        request_body: { payment_id: externalId },
        response_body: resBody,
        status_code: apiRes.status,
        duration_ms: durationMs,
      });
    } catch {
      // ignore log failure
    }

    const newStatus = (resBody as any).status || "unknown";

    // Update local transaction
    try {
      if (transactionId) {
        await sb.from("payment_transactions").update({ status: newStatus }).eq("id", transactionId);
      } else {
        await sb.from("payment_transactions").update({ status: newStatus }).eq("external_id", externalId);
      }
    } catch {
      // ignore update failure
    }

    return new Response(
      JSON.stringify({
        payment_id: externalId,
        status: newStatus,
        details: resBody,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("allowpay-payment-status error:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao consultar status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

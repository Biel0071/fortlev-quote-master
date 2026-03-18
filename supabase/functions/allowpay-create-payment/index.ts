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
  const companyId = Deno.env.get("ALLOWPAY_COMPANY_ID")!;
  const integrationToken = Deno.env.get("ALLOWPAY_INTEGRATION_TOKEN")!;
  const gatewayId = Deno.env.get("ALLOWPAY_GATEWAY_ID")!;

  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { amount, currency, payment_method, customer, metadata } = body;

    if (!amount || !payment_method || !customer?.name || !customer?.email) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: amount, payment_method, customer.name, customer.email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowpayPayload = {
      amount,
      currency: currency || "BRL",
      method: payment_method,
      company_id: companyId,
      customer: { name: customer.name, email: customer.email, phone: customer.phone || null },
      metadata: metadata || {},
      gateway_id: gatewayId,
      integration_token: integrationToken,
    };

    const startMs = Date.now();

    const apiRes = await fetch(`${API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(allowpayPayload),
    });

    const durationMs = Date.now() - startMs;
    let resBody: Record<string, unknown> = {};
    const rawText = await apiRes.text();

    try {
      resBody = JSON.parse(rawText);
    } catch {
      resBody = { raw };
    }

    // Log the API call
    try {
      await sb.from("payment_logs").insert({
        direction: "outbound",
        method: "POST",
        url: `${API_URL}/payments`,
        request_body: allowpayPayload,
        response_body: resBody,
        status_code: apiRes.status,
        duration_ms: durationMs,
      });
    } catch (logErr) {
      console.error("Erro ao salvar log:", logErr);
    }

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar pagamento no AllowPay", details: resBody }),
        { status: apiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up internal gateway UUID
    let gwId: string | null = null;
    try {
      const { data: gwRow } = await sb
        .from("payment_gateways")
        .select("id")
        .eq("provider", "allowpay")
        .eq("status", "active")
        .limit(1)
        .single();
      gwId = gwRow?.id || null;
    } catch {
      // no gateway row, proceed without
    }

    // Save transaction
    let txId: string | null = null;
    try {
      const { data: tx } = await sb.from("payment_transactions").insert({
        order_id: metadata?.order_id || null,
        gateway_id: gwId,
        amount,
        method: payment_method,
        status: "pending",
        external_id: (resBody as any).id || (resBody as any).payment_id || null,
        metadata_json: {
          allowpay_response: resBody,
          customer,
          currency: currency || "BRL",
        },
      }).select("id").single();
      txId = tx?.id || null;
    } catch (txErr) {
      console.error("Erro ao salvar transação:", txErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: txId,
        payment_id: (resBody as any).id || (resBody as any).payment_id,
        qr_code: (resBody as any).qr_code || (resBody as any).pix_qr_code || null,
        qr_code_base64: (resBody as any).qr_code_base64 || (resBody as any).qr_code_image || null,
        payment_url: (resBody as any).payment_url || (resBody as any).checkout_url || null,
        boleto_url: (resBody as any).boleto_url || null,
        status: (resBody as any).status || "pending",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("allowpay-create-payment error:", err);

    try {
      await sb.from("payment_logs").insert({
        direction: "outbound",
        method: "POST",
        url: `${API_URL}/payments`,
        request_body: {},
        response_body: { error: String(err) },
        status_code: 500,
        duration_ms: 0,
      });
    } catch {
      // ignore log failure
    }

    return new Response(
      JSON.stringify({ error: "Erro interno ao processar pagamento" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

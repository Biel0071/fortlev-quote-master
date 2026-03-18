import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("ALLOWPAY_API_KEY")!;
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
      payment_method,
      customer: { name: customer.name, email: customer.email, phone: customer.phone || null },
      metadata: metadata || {},
      gateway_id: gatewayId,
      integration_token: integrationToken,
    };

    const startMs = Date.now();

    const apiRes = await fetch("https://api.allowpay.com/api/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Integration-Token": integrationToken,
      },
      body: JSON.stringify(allowpayPayload),
    });

    const durationMs = Date.now() - startMs;
    let resBody: any = {};

    try {
      resBody = await apiRes.json();
    } catch {
      resBody = { raw: await apiRes.text() };
    }

    // Log the API call
    await sb.from("payment_logs").insert({
      direction: "outbound",
      method: "POST",
      url: "https://api.allowpay.com/api/payments/create",
      request_body: allowpayPayload,
      response_body: resBody,
      status_code: apiRes.status,
      duration_ms: durationMs,
    });

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar pagamento no AllowPay", details: resBody }),
        { status: apiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up internal gateway UUID
    const { data: gwRow } = await sb
      .from("payment_gateways")
      .select("id")
      .eq("provider", "allowpay")
      .eq("status", "active")
      .limit(1)
      .single();

    // Save transaction
    const { data: tx, error: txErr } = await sb.from("payment_transactions").insert({
      order_id: metadata?.order_id || null,
      gateway_id: gwRow?.id || null,
      amount,
      method: payment_method,
      status: "pending",
      external_id: resBody.payment_id || resBody.id || null,
      metadata_json: {
        allowpay_response: resBody,
        customer,
        currency: currency || "BRL",
      },
    }).select("id").single();

    if (txErr) {
      console.error("Erro ao salvar transação:", txErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: tx?.id,
        payment_id: resBody.payment_id || resBody.id,
        qr_code: resBody.qr_code || resBody.pix_qr_code || null,
        qr_code_base64: resBody.qr_code_base64 || null,
        payment_url: resBody.payment_url || resBody.checkout_url || null,
        boleto_url: resBody.boleto_url || null,
        status: "pending",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("allowpay-create-payment error:", err);

    await sb.from("payment_logs").insert({
      direction: "outbound",
      method: "POST",
      url: "https://api.allowpay.com/api/payments/create",
      request_body: {},
      response_body: { error: String(err) },
      status_code: 500,
      duration_ms: 0,
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: "Erro interno ao processar pagamento" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

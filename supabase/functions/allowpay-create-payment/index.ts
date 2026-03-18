import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Codiguz / AllowPay API
const API_URL = "https://mpmukwourfqcctvrmmje.supabase.co/functions/v1/transactions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const secretKey = Deno.env.get("ALLOWPAY_API_KEY")!;

  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { amount, payment_method, customer, metadata, postback_url } = body;

    if (!amount || !customer?.name || !customer?.email) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: amount, customer.name, customer.email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Basic Auth header: base64(SECRET_KEY:x)
    const basicAuth = btoa(`${secretKey}:x`);

    // Build webhook URL for postbacks
    const webhookUrl = postback_url || `${supabaseUrl}/functions/v1/allowpay-webhook`;

    // Amount must be in centavos (integer)
    const amountCents = Math.round(amount * 100);

    const allowpayPayload: Record<string, unknown> = {
      amount: amountCents,
      paymentMethod: (payment_method || "pix").toUpperCase(),
      customer: {
        name: customer.name,
        email: customer.email,
        ...(customer.phone ? { phone: { ddd: customer.phone.slice(0, 2), number: customer.phone.slice(2) } } : {}),
        ...(customer.document ? { document: customer.document } : {}),
      },
      postbackUrl: webhookUrl,
      metadata: metadata || {},
    };

    const startMs = Date.now();

    const apiRes = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(allowpayPayload),
    });

    const durationMs = Date.now() - startMs;
    const rawText = await apiRes.text();
    let resBody: Record<string, unknown> = {};

    try {
      resBody = JSON.parse(rawText);
    } catch {
      resBody = { raw: rawText };
    }

    // Log the API call
    try {
      await sb.from("payment_logs").insert({
        direction: "outbound",
        method: "POST",
        url: API_URL,
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
      // no gateway row
    }

    // Save transaction
    const txData = resBody as any;
    let txId: string | null = null;
    try {
      const { data: tx } = await sb.from("payment_transactions").insert({
        order_id: metadata?.order_id || null,
        gateway_id: gwId,
        amount: amountCents,
        method: (payment_method || "pix").toLowerCase(),
        status: "pending",
        external_id: txData.id || null,
        metadata_json: {
          allowpay_response: resBody,
          customer,
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
        payment_id: txData.id,
        qr_code: txData.pix?.qrcode || null,
        qr_code_base64: null,
        payment_url: null,
        boleto_url: txData.boleto?.url || null,
        status: txData.status || "waiting_payment",
        expiration_date: txData.pix?.expirationDate || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("allowpay-create-payment error:", err);

    try {
      await sb.from("payment_logs").insert({
        direction: "outbound",
        method: "POST",
        url: API_URL,
        request_body: {},
        response_body: { error: String(err) },
        status_code: 500,
        duration_ms: 0,
      });
    } catch {
      // ignore
    }

    return new Response(
      JSON.stringify({ error: "Erro interno ao processar pagamento" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = Deno.env.get("ALLOWPAY_API_URL") || "https://allow-gi0i.onrender.com";
const CREATE_PIX_URL = `${API_BASE}/api/v2/allowpay-seller/create-pix`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("ALLOWPAY_API_KEY")!;
  const webhookSecret = Deno.env.get("ALLOWPAY_WEBHOOK_SECRET") || undefined;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { amount, customer, metadata, description } = body;

    if (!amount || !customer?.name || !customer?.email || !customer?.phone) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: amount, customer.name, customer.email, customer.phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountCents = Math.round(Number(amount) * 100);
    const cellphone = String(customer.phone).replace(/\D/g, "");

    // Provedor PIX exige taxId (CPF) válido. Se não informado, geramos um CPF válido aleatório
    // (somente para criar a cobrança; identificação real fica em metadata/customer).
    const genValidCpf = () => {
      const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
      const calc = (base: number[]) => {
        const sum = base.reduce((acc, d, i) => acc + d * (base.length + 1 - i), 0);
        const r = (sum * 10) % 11;
        return r === 10 ? 0 : r;
      };
      const d1 = calc(n);
      const d2 = calc([...n, d1]);
      return [...n, d1, d2].join("");
    };
    const providedTaxId = customer.document?.number
      ? String(customer.document.number).replace(/\D/g, "")
      : "";
    const taxId = providedTaxId.length === 11 ? providedTaxId : genValidCpf();

    const webhookUrl = `${supabaseUrl}/functions/v1/allowpay-webhook`;

    const payload: Record<string, unknown> = {
      api_key: apiKey,
      amount: amountCents,
      description: description || `Pedido ${metadata?.order_id || ""}`.trim(),
      customer: {
        name: customer.name,
        email: customer.email,
        cellphone,
        ...(taxId ? { taxId } : {}),
      },
      webhook_url: webhookUrl,
      ...(webhookSecret ? { webhook_secret: webhookSecret } : {}),
    };

    const startMs = Date.now();
    const apiRes = await fetch(CREATE_PIX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const durationMs = Date.now() - startMs;
    const rawText = await apiRes.text();
    let resBody: any = {};
    try { resBody = JSON.parse(rawText); } catch { resBody = { raw: rawText }; }

    // Log (omit api_key)
    const { api_key: _omit, ...safePayload } = payload as any;
    try {
      await sb.from("payment_logs").insert({
        direction: "outbound",
        method: "POST",
        url: CREATE_PIX_URL,
        request_body: safePayload,
        response_body: resBody,
        status_code: apiRes.status,
        duration_ms: durationMs,
      });
    } catch (e) { console.error("log err", e); }

    if (!apiRes.ok) {
      const providerMsg = resBody?.error || resBody?.message || resBody?.details?.error;
      const friendly = providerMsg
        ? `Provedor PIX indisponível: ${providerMsg}`
        : "O provedor PIX está temporariamente indisponível. Tente novamente em instantes ou finalize via WhatsApp.";
      console.error("allowpay upstream failure", { status: apiRes.status, body: resBody });
      return new Response(
        JSON.stringify({ error: friendly, provider_error: providerMsg, status: apiRes.status, details: resBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { txid, route, pix_code, pix_qr_code } = resBody;

    // Gateway lookup
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
    } catch { /* ignore */ }

    let txId: string | null = null;
    try {
      const { data: tx } = await sb.from("payment_transactions").insert({
        order_id: metadata?.order_id || null,
        gateway_id: gwId,
        amount: amountCents,
        method: "pix",
        status: "pending",
        external_id: txid,
        metadata_json: { route, allowpay_response: resBody, customer },
      }).select("id").single();
      txId = tx?.id || null;
    } catch (e) { console.error("tx err", e); }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: txId,
        payment_id: txid,
        route,
        qr_code: pix_code,
        qr_code_base64: null,
        payment_url: pix_qr_code,
        boleto_url: null,
        status: "waiting_payment",
        expiration_date: null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("allowpay-create-payment error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar pagamento", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

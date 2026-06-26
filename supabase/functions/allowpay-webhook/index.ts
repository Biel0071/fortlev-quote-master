import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-allowpay-event, x-allowpay-timestamp, x-allowpay-signature",
};

const STATUS_MAP: Record<string, string> = {
  waiting_payment: "pending",
  approved: "approved",
  expired: "failed",
  declined: "failed",
  canceled: "failed",
  refunded: "refunded",
  chargeback: "failed",
};

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const expected = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  // constant-time compare
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = Deno.env.get("ALLOWPAY_WEBHOOK_SECRET");
  const sb = createClient(supabaseUrl, serviceKey);

  let rawBody = "";
  try {
    rawBody = await req.text();
    const signature = req.headers.get("x-allowpay-signature");

    if (webhookSecret && signature) {
      const ok = await verifySignature(rawBody, signature, webhookSecret);
      if (!ok) {
        console.warn("AllowPay signature inválida");
        return new Response(JSON.stringify({ error: "Assinatura inválida" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.event || req.headers.get("x-allowpay-event") || "unknown";
    const eventId = payload.event_id;
    const externalId = payload.txid;
    const rawStatus = payload.status;

    console.log(`Webhook AllowPay: event=${eventName}, txid=${externalId}, status=${rawStatus}, event_id=${eventId}`);

    // Idempotency: ignore duplicate event_id
    if (eventId) {
      const { data: existing } = await sb
        .from("payment_webhooks")
        .select("id")
        .eq("source", "allowpay")
        .eq("external_id", eventId)
        .maybeSingle();
      if (existing) {
        console.log(`Evento ${eventId} já processado — ignorando`);
        return new Response(JSON.stringify({ received: true, duplicate: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let webhookLogId: string | null = null;
    try {
      const { data: wh } = await sb.from("payment_webhooks").insert({
        source: "allowpay",
        event: eventName,
        external_id: eventId,
        payload,
        status: "received",
      }).select("id").single();
      webhookLogId = wh?.id || null;
    } catch { /* ignore */ }

    try {
      await sb.from("payment_logs").insert({
        direction: "inbound",
        method: "POST",
        url: "/allowpay-webhook",
        request_body: payload,
        response_body: { event: eventName, status: rawStatus, txid: externalId },
        status_code: 200,
        duration_ms: 0,
      });
    } catch { /* ignore */ }

    const mapped = STATUS_MAP[rawStatus];
    if (mapped && externalId) {
      const { data: txRows } = await sb
        .from("payment_transactions")
        .select("id, order_id")
        .eq("external_id", externalId);

      if (txRows && txRows.length > 0) {
        const tx = txRows[0];
        await sb.from("payment_transactions").update({
          status: mapped,
          metadata_json: { last_event: eventName, updated_via: "webhook" },
        }).eq("id", tx.id);

        if (rawStatus === "approved" && tx.order_id) {
          await sb.from("store_orders").update({ status: "pago" }).eq("id", tx.order_id);
        } else if (rawStatus === "refunded" && tx.order_id) {
          await sb.from("store_orders").update({ status: "reembolsado" }).eq("id", tx.order_id);
        }
      } else {
        console.warn(`Transação não encontrada: ${externalId}`);
      }

      if (webhookLogId) {
        await sb.from("payment_webhooks").update({ status: "processed", response_code: 200 }).eq("id", webhookLogId);
      }
    }

    return new Response(JSON.stringify({ received: true, event: eventName, status: rawStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("allowpay-webhook error:", err);
    try {
      await sb.from("payment_logs").insert({
        direction: "inbound",
        method: "POST",
        url: "/allowpay-webhook",
        request_body: { raw: rawBody.slice(0, 1000) },
        response_body: { error: String(err) },
        status_code: 500,
        duration_ms: 0,
      });
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: "Erro interno no webhook" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

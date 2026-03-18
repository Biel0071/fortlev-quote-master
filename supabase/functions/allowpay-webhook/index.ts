import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-allowpay-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = Deno.env.get("ALLOWPAY_WEBHOOK_SECRET");

  const sb = createClient(supabaseUrl, serviceKey);

  try {
    // Optional webhook secret validation
    if (webhookSecret) {
      const incomingSecret =
        req.headers.get("x-webhook-secret") ||
        req.headers.get("x-allowpay-signature") ||
        new URL(req.url).searchParams.get("secret");

      if (incomingSecret && incomingSecret !== webhookSecret) {
        console.warn("Webhook secret inválido");
        return new Response(
          JSON.stringify({ error: "Webhook secret inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const payload = await req.json();

    // Codiguz postback format: { id, type, objectId, data: { ... } }
    const postbackType = payload.type || "unknown";
    const txData = payload.data || payload;
    const externalId = payload.objectId || txData.id || payload.id;
    const codiguzStatus = txData.status;

    console.log(`Webhook recebido: type=${postbackType}, objectId=${externalId}, status=${codiguzStatus}`);

    // Log webhook event
    let webhookLogId: string | null = null;
    try {
      const { data: webhookLog } = await sb.from("payment_webhooks").insert({
        source: "allowpay",
        event: `${postbackType}.${codiguzStatus}`,
        payload,
        status: "received",
      }).select("id").single();
      webhookLogId = webhookLog?.id || null;
    } catch {
      // ignore
    }

    // Log to payment_logs
    try {
      await sb.from("payment_logs").insert({
        direction: "inbound",
        method: "POST",
        url: "/allowpay-webhook",
        request_body: payload,
        response_body: { type: postbackType, status: codiguzStatus, external_id: externalId },
        status_code: 200,
        duration_ms: 0,
      });
    } catch {
      // ignore
    }

    // Map Codiguz status to internal status
    const statusMap: Record<string, string> = {
      waiting_payment: "pending",
      processing: "pending",
      authorized: "pending",
      paid: "approved",
      refunded: "refunded",
      refused: "failed",
      chargedback: "failed",
      canceled: "failed",
    };

    const newStatus = statusMap[codiguzStatus];

    if (newStatus && externalId) {
      try {
        const { data: txRows } = await sb
          .from("payment_transactions")
          .select("id, order_id")
          .eq("external_id", externalId);

        if (txRows && txRows.length > 0) {
          const tx = txRows[0];

          await sb.from("payment_transactions").update({
            status: newStatus,
            metadata_json: {
              last_webhook_event: codiguzStatus,
              updated_via: "webhook",
              paid_at: txData.paidAt || null,
            },
          }).eq("id", tx.id);

          // If paid, update the order to "pago"
          if (codiguzStatus === "paid" && tx.order_id) {
            await sb.from("store_orders").update({ status: "pago" }).eq("id", tx.order_id);
            console.log(`Pedido ${tx.order_id} atualizado para pago`);
          }

          // If refunded, update order
          if (codiguzStatus === "refunded" && tx.order_id) {
            await sb.from("store_orders").update({ status: "reembolsado" }).eq("id", tx.order_id);
          }
        } else {
          console.warn(`Transação não encontrada para external_id: ${externalId}`);
        }
      } catch (txErr) {
        console.error("Erro ao atualizar transação:", txErr);
      }

      // Mark webhook as processed
      if (webhookLogId) {
        try {
          await sb.from("payment_webhooks").update({ status: "processed", response_code: 200 }).eq("id", webhookLogId);
        } catch {
          // ignore
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true, type: postbackType, status: codiguzStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("allowpay-webhook error:", err);

    try {
      await sb.from("payment_logs").insert({
        direction: "inbound",
        method: "POST",
        url: "/allowpay-webhook",
        request_body: {},
        response_body: { error: String(err) },
        status_code: 500,
        duration_ms: 0,
      });
    } catch {
      // ignore
    }

    return new Response(
      JSON.stringify({ error: "Erro interno no webhook" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

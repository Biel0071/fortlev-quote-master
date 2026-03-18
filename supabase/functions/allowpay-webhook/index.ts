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
  const webhookSecret = Deno.env.get("ALLOWPAY_WEBHOOK_SECRET")!;

  const sb = createClient(supabaseUrl, serviceKey);

  try {
    // Validate webhook secret
    const incomingSecret =
      req.headers.get("x-webhook-secret") ||
      req.headers.get("x-allowpay-signature") ||
      new URL(req.url).searchParams.get("secret");

    if (incomingSecret !== webhookSecret) {
      console.warn("Webhook secret inválido");
      return new Response(
        JSON.stringify({ error: "Webhook secret inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();
    const event = payload.event || payload.type || "unknown";
    const paymentId = payload.payment_id || payload.data?.payment_id || payload.data?.id || payload.id;

    // Log webhook event
    let webhookLogId: string | null = null;
    try {
      const { data: webhookLog } = await sb.from("payment_webhooks").insert({
        source: "allowpay",
        event,
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
        response_body: { event, payment_id: paymentId },
        status_code: 200,
        duration_ms: 0,
      });
    } catch {
      // ignore
    }

    // Process event
    const statusMap: Record<string, string> = {
      "payment.created": "pending",
      "payment.pending": "pending",
      "payment.approved": "approved",
      "payment.failed": "failed",
      "payment.refunded": "refunded",
      "payment.cancelled": "failed",
    };

    const newStatus = statusMap[event];

    if (newStatus && paymentId) {
      // Update transaction status
      try {
        const { data: txRows } = await sb
          .from("payment_transactions")
          .select("id, order_id")
          .eq("external_id", paymentId);

        if (txRows && txRows.length > 0) {
          const tx = txRows[0];

          await sb.from("payment_transactions").update({
            status: newStatus,
            metadata_json: { last_webhook_event: event, updated_via: "webhook" },
          }).eq("id", tx.id);

          // If approved, update the order to "pago"
          if (event === "payment.approved" && tx.order_id) {
            await sb.from("store_orders").update({ status: "pago" }).eq("id", tx.order_id);
            console.log(`Pedido ${tx.order_id} atualizado para pago`);
          }

          // If refunded, update order
          if (event === "payment.refunded" && tx.order_id) {
            await sb.from("store_orders").update({ status: "reembolsado" }).eq("id", tx.order_id);
          }
        } else {
          console.warn(`Transação não encontrada para payment_id: ${paymentId}`);
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
      JSON.stringify({ received: true, event }),
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
      // ignore log failure
    }

    return new Response(
      JSON.stringify({ error: "Erro interno no webhook" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

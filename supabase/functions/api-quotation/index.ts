// Edge function: API REST para bots (WhatsApp, ERP, etc)
// Endpoints:
//   POST /analyze   -> analisa texto/imagem e retorna itens + cliente
//   POST /generate  -> cria orçamento a partir da análise
//   GET  /:id       -> retorna orçamento (com URLs de PDF/PNG quando prontos)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function authenticate(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey.length < 16) return null;
  const { data } = await supabase
    .from("api_keys")
    .select("id, store_id, permissions, active")
    .eq("key", apiKey)
    .eq("active", true)
    .maybeSingle();
  if (!data) return null;
  // Best-effort last_used_at update
  supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
  return data as { id: string; store_id: string; permissions: string[]; active: boolean };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await authenticate(req);
    if (!auth) return json({ error: "API key inválida ou ausente. Envie no header x-api-key." }, 401);

    const url = new URL(req.url);
    // path = /api-quotation/<sub>
    const sub = url.pathname.replace(/^.*\/api-quotation/, "").replace(/^\//, "");

    // POST /analyze -> proxy para analyze-quotation-image
    if (req.method === "POST" && sub.startsWith("analyze")) {
      const body = await req.json().catch(() => ({}));
      const { data, error } = await supabase.functions.invoke("analyze-quotation-image", {
        body: { text: body.text ?? "", images: body.images ?? [] },
      });
      if (error) return json({ error: error.message ?? "Falha na análise" }, 500);
      return json({ ok: true, store_id: auth.store_id, analysis: data });
    }

    // POST /generate -> cria registro de orçamento (rascunho)
    if (req.method === "POST" && sub.startsWith("generate")) {
      const body = await req.json().catch(() => ({}));
      const a = body.analysis ?? body;
      if (!a || !Array.isArray(a.items)) return json({ error: "Payload inválido: analysis.items obrigatório" }, 400);

      const subtotal = a.items.reduce((s: number, i: any) => s + Number(i.total ?? (i.unit_price ?? 0) * (i.quantity ?? 0)), 0);
      const total = Number(a.total ?? subtotal + Number(a.shipping ?? 0) - Number(a.discount ?? 0));

      const { data: q, error } = await supabase
        .from("construction_quotations")
        .insert({
          store_id: auth.store_id,
          customer_name: a.customer?.name ?? body.customer_name ?? "Cliente API",
          customer_phone: a.customer?.phone ?? null,
          customer_email: a.customer?.email ?? null,
          customer_document: a.customer?.cpf_cnpj ?? null,
          delivery_address: a.customer?.address ?? null,
          items: a.items,
          subtotal,
          total,
          status: "draft",
          source: "api_bot",
        } as any)
        .select("id")
        .single();

      if (error) return json({ error: error.message }, 500);

      // Fire webhooks (best-effort, non-blocking)
      supabase.from("api_webhooks").select("url, secret")
        .eq("store_id", auth.store_id).eq("event", "quotation.created").eq("active", true)
        .then(({ data: hooks }) => {
          for (const h of hooks ?? []) {
            fetch(h.url, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Webhook-Secret": h.secret, "X-Event": "quotation.created" },
              body: JSON.stringify({ quotation_id: q.id, store_id: auth.store_id, total }),
            }).catch(() => {});
          }
        });

      return json({ ok: true, quotation_id: q.id, total });
    }

    // GET /:id
    if (req.method === "GET" && sub.length > 0) {
      const id = sub.split("/")[0];
      const { data, error } = await supabase
        .from("construction_quotations")
        .select("id, customer_name, total, status, created_at")
        .eq("id", id)
        .eq("store_id", auth.store_id)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Orçamento não encontrado" }, 404);
      return json({ ok: true, quotation: data });
    }

    return json({
      error: "Rota não encontrada",
      endpoints: ["POST /analyze", "POST /generate", "GET /:id"],
    }, 404);
  } catch (e: any) {
    return json({ error: e?.message ?? "Erro interno" }, 500);
  }
});

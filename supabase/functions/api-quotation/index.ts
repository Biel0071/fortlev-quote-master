// Edge function: API REST para bots (WhatsApp, ERP, extensões)
// Endpoints:
//   POST /analyze         -> analisa texto/imagem (proxy p/ analyze-quotation-image)
//   POST /generate        -> cria orçamento a partir da análise
//   GET  /:id             -> retorna orçamento
//   POST /validate-token  -> valida token de acesso por loja
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

type KeyRecord = {
  id: string;
  store_id: string;
  permissions: string[];
  active: boolean;
  quota_limit: number;
  quota_used: number;
  rate_limit: number;
  starts_at?: string | null;
  expires_at?: string | null;
};

async function authenticate(req: Request): Promise<KeyRecord | { error: string; status: number } | null> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey.length < 16) return null;
  const { data } = await supabase
    .from("api_keys")
    .select("id, store_id, permissions, active, quota_limit, quota_used, rate_limit, starts_at, expires_at")
    .eq("key", apiKey)
    .eq("active", true)
    .maybeSingle();
  if (!data) return null;

  const now = new Date();
  if (data.starts_at && new Date(data.starts_at) > now) {
    return { error: "Chave ainda não está ativa", status: 403 };
  }
  if (data.expires_at && new Date(data.expires_at) < now) {
    return { error: "Chave expirada", status: 401 };
  }
  if ((data.quota_limit ?? 0) > 0 && (data.quota_used ?? 0) >= data.quota_limit) {
    return { error: "Quota excedida", status: 429 };
  }

  // Increment usage (best-effort, non-blocking)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), quota_used: (data.quota_used ?? 0) + 1 })
    .eq("id", data.id)
    .then(() => {});

  return data as KeyRecord;
}

async function logUsage(
  keyId: string,
  storeId: string,
  req: Request,
  endpoint: string,
  status: number,
  startTs: number,
  error?: string,
) {
  try {
    await supabase.from("api_usage_logs").insert({
      api_key_id: keyId,
      store_id: storeId,
      endpoint,
      method: req.method,
      status_code: status,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
      duration_ms: Date.now() - startTs,
      error: error ?? null,
    });
  } catch (_) { /* best-effort */ }
}

function hasPermission(auth: KeyRecord, perm: string): boolean {
  return Array.isArray(auth.permissions) && auth.permissions.includes(perm);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startTs = Date.now();

  try {
    const url = new URL(req.url);
    const sub = url.pathname.replace(/^.*\/api-quotation/, "").replace(/^\//, "");

    // POST /validate-token — pública (não exige x-api-key)
    if (req.method === "POST" && sub.startsWith("validate-token")) {
      const body = await req.json().catch(() => ({}));
      const token = String(body.token ?? "").trim();
      if (!token) return json({ valid: false, error: "token obrigatório" }, 400);

      const { data: t } = await supabase
        .from("quotation_access_tokens")
        .select("id, store_id, access_scope, status, expires_at, max_uses, uses_count, name, stores(name, slug)")
        .eq("token", token)
        .maybeSingle();

      if (!t) return json({ valid: false, error: "Token inválido" }, 401);
      if (t.status !== "active") return json({ valid: false, error: "Token inativo" }, 401);
      if (t.expires_at && new Date(t.expires_at) < new Date())
        return json({ valid: false, error: "Token expirado" }, 401);
      if ((t.max_uses ?? 0) > 0 && (t.uses_count ?? 0) >= t.max_uses)
        return json({ valid: false, error: "Limite de usos atingido" }, 429);

      return json({
        valid: true,
        store_id: t.store_id,
        store: t.stores,
        scope: t.access_scope,
        name: t.name,
      });
    }

    const auth = await authenticate(req);
    if (!auth) return json({ error: "API key inválida ou ausente. Envie em x-api-key." }, 401);
    if ("error" in auth) return json({ error: auth.error }, auth.status);

    const respond = (body: any, status = 200, err?: string) => {
      void logUsage(auth.id, auth.store_id, req, sub || "/", status, startTs, err);
      return json(body, status);
    };

    // POST /analyze
    if (req.method === "POST" && sub.startsWith("analyze")) {
      if (!hasPermission(auth, "quotation:create")) return respond({ error: "Sem permissão quotation:create" }, 403, "forbidden");
      const body = await req.json().catch(() => ({}));
      if (!body.text && !body.image_base64 && !body.images)
        return respond({ error: "Envie text ou image_base64/images" }, 400, "invalid_payload");

      const { data, error } = await supabase.functions.invoke("analyze-quotation-image", {
        body: {
          text: body.text ?? "",
          images: body.images ?? (body.image_base64 ? [body.image_base64] : []),
        },
      });
      if (error) return respond({ error: error.message ?? "Falha na análise" }, 500, error.message);
      return respond({ ok: true, store_id: auth.store_id, analysis: data });
    }

    // POST /generate
    if (req.method === "POST" && sub.startsWith("generate")) {
      if (!hasPermission(auth, "quotation:create")) return respond({ error: "Sem permissão quotation:create" }, 403, "forbidden");
      const body = await req.json().catch(() => ({}));
      const a = body.analysis ?? body;
      if (!a || !Array.isArray(a.items)) return respond({ error: "Payload inválido: analysis.items obrigatório" }, 400, "invalid_payload");

      const subtotal = a.items.reduce(
        (s: number, i: any) => s + Number(i.total ?? (i.unit_price ?? 0) * (i.quantity ?? 0)),
        0,
      );
      const total = Number(a.total ?? subtotal + Number(a.shipping ?? a.freight ?? 0) - Number(a.discount ?? 0));

      const { data: q, error } = await supabase
        .from("construction_quotations")
        .insert({
          customer_json: a.customer ?? { name: body.customer_name ?? "Cliente API" },
          items_json: a.items,
          company_info_json: a.company ?? null,
          company_id: a.company_id ?? body.company_id ?? null,
          subtotal,
          discount: Number(a.discount ?? 0),
          freight: Number(a.shipping ?? a.freight ?? 0),
          total,
          status: "draft",
          observations: `[api_bot key:${auth.id}] ${a.observations ?? ""}`.trim(),
        } as any)
        .select("id, number, total")
        .single();

      if (error) return respond({ error: error.message }, 500, error.message);

      supabase
        .from("api_webhooks")
        .select("url, secret")
        .eq("store_id", auth.store_id)
        .eq("event", "quotation.created")
        .eq("active", true)
        .then(({ data: hooks }) => {
          for (const h of hooks ?? []) {
            fetch(h.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Webhook-Secret": h.secret,
                "X-Event": "quotation.created",
              },
              body: JSON.stringify({ quotation_id: q.id, store_id: auth.store_id, total: q.total }),
            }).catch(() => {});
          }
        });

      return respond({ ok: true, quotation_id: q.id, number: q.number, total: q.total });
    }

    // GET /:id
    if (req.method === "GET" && sub.length > 0) {
      if (!hasPermission(auth, "quotation:read")) return respond({ error: "Sem permissão quotation:read" }, 403, "forbidden");
      const id = sub.split("/")[0];
      const { data, error } = await supabase
        .from("construction_quotations")
        .select("id, number, customer_json, items_json, subtotal, discount, freight, total, status, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) return respond({ error: error.message }, 500, error.message);
      if (!data) return respond({ error: "Orçamento não encontrado" }, 404, "not_found");
      return respond({ ok: true, quotation: data });
    }

    return json(
      {
        error: "Rota não encontrada",
        endpoints: ["POST /analyze", "POST /generate", "GET /:id", "POST /validate-token"],
      },
      404,
    );
  } catch (e: any) {
    return json({ error: e?.message ?? "Erro interno" }, 500);
  }
});

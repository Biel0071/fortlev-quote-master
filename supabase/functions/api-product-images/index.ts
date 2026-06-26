import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-api-key") ?? "";
    const ip = req.headers.get("x-forwarded-for") ?? null;
    const ua = req.headers.get("user-agent") ?? null;
    const url = new URL(req.url);
    const productId = url.searchParams.get("product_id");
    const sku = url.searchParams.get("sku");

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: gate, error: gateErr } = await sb.rpc("api_consume_key", {
      _raw_key: apiKey,
      _endpoint: "/api-product-images",
      _method: req.method,
      _scope: "product:read",
      _ip: ip,
      _user_agent: ua,
    });
    if (gateErr) return json({ error: gateErr.message }, 500);
    const g = (gate as any)?.[0];
    if (!g?.ok) return json({ error: g?.message ?? "Unauthorized" }, g?.status_code ?? 401);

    let q = sb
      .from("store_products")
      .select("id, sku, name, store_product_images(path, sort_order, media_type)")
      .eq("store_id", g.store_id)
      .limit(50);
    if (productId) q = q.eq("id", productId);
    else if (sku) q = q.eq("sku", sku);

    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);

    const result = (data ?? []).map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      images: (p.store_product_images ?? [])
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((im: any) => ({
          url: `${SUPABASE_URL}/storage/v1/object/public/product-images/${im.path}`,
          path: im.path,
          media_type: im.media_type,
        })),
    }));

    return json({ ok: true, count: result.length, data: result });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

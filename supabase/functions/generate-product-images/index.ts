// Lovable Cloud function: generate-product-images
// Generates high-quality product images using Lovable AI Gateway and stores them in the public bucket.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-platform-runtime, x-supabase-client-platform-runtime-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  productId: string;
  overwrite?: boolean;
  count?: number;
};

function buildPrompt({
  name,
  description,
  angle,
}: {
  name: string;
  description?: string | null;
  angle: string;
}) {
  const desc = (description ?? "").trim();

  return [
    `Foto de produto para e-commerce: ${name}.`,
    desc ? `Descrição/Detalhes: ${desc}.` : "",
    `Ângulo/Enquadramento: ${angle}.`,
    "Estilo: fotografia de estúdio realista, alta qualidade, foco nítido, iluminação suave, sombra discreta.",
    "Fundo: neutro (cinza claro ou branco), sem cenário.",
    "Regras: sem texto, sem logotipos, sem marcas d’água, sem etiquetas promocionais.",
    "Composição: produto centralizado, ocupando boa parte do quadro.",
  ]
    .filter(Boolean)
    .join(" ");
}

const ANGLES = [
  "frontal",
  "3/4 (ângulo diagonal) mostrando profundidade",
  "3/4 oposto (ângulo diagonal)",
  "lateral",
  "close-up de detalhe (material/conexão/texture)",
];

async function aiGeneratePng({
  LOVABLE_API_KEY,
  prompt,
}: {
  LOVABLE_API_KEY: string;
  prompt: string;
}) {
  const genResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
      temperature: 0.7,
    }),
  });

  if (!genResp.ok) {
    const t = await genResp.text();
    throw new Error(`image_generation_failed:${genResp.status}:${t}`);
  }

  const payload = await genResp.json();
  const rawUrl =
    (payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined) ??
    (payload?.choices?.[0]?.message?.images?.[0]?.url as string | undefined) ??
    undefined;

  if (!rawUrl) throw new Error("image_url_missing");

  const b64 = rawUrl.includes(",") ? rawUrl.split(",")[1] : rawUrl;
  if (!b64) throw new Error("image_b64_missing");

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!url || !anon || !service) throw new Error("Backend env vars missing");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";

    // Client bound to caller (RLS) just for auth + role check
    const userClient = createClient(url, anon, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleOk, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    if (roleErr || !roleOk) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const productId = String(body?.productId ?? "").trim();
    const overwrite = Boolean(body?.overwrite);
    const countRaw = Number(body?.count ?? 5);
    const count = Math.max(1, Math.min(5, Number.isFinite(countRaw) ? countRaw : 5));

    if (!productId) {
      return new Response(JSON.stringify({ error: "productId_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client (service role) for storage + DB writes
    const admin = createClient(url, service);

    const { data: p, error: pErr } = await admin
      .from("store_products")
      .select("id, name, description")
      .eq("id", productId)
      .maybeSingle();

    if (pErr || !p) {
      return new Response(JSON.stringify({ error: "product_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (overwrite) {
      const { data: existing } = await admin
        .from("store_product_images")
        .select("id, path")
        .eq("product_id", productId);

      const paths = (existing ?? []).map((x: any) => String(x.path)).filter(Boolean);

      // Remove DB rows first (so UI doesn't reference deleted files)
      await admin.from("store_product_images").delete().eq("product_id", productId);

      // Best-effort storage removal
      if (paths.length > 0) {
        const { error: remErr } = await admin.storage.from("product-images").remove(paths);
        if (remErr) console.error("storage remove error", remErr);
      }
    }

    const inserted: Array<{ path: string; sort_order: number; public_url: string }> = [];

    for (let i = 0; i < count; i++) {
      const angle = ANGLES[i] ?? `variação ${i + 1}`;
      const prompt = buildPrompt({ name: String(p.name), description: p.description, angle });

      const pngBytes = await aiGeneratePng({ LOVABLE_API_KEY, prompt });

      const safeId = String(productId).slice(0, 8);
      const path = `ai/products/${safeId}/${Date.now()}-${crypto.randomUUID()}.png`;

      const { error: upErr } = await admin.storage.from("product-images").upload(path, pngBytes, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "3600",
      });

      if (upErr) throw new Error(`upload_failed:${upErr.message}`);

      const { error: insErr } = await admin
        .from("store_product_images")
        .insert({ product_id: productId, path, sort_order: i } as any);

      if (insErr) throw new Error(`db_insert_failed:${insErr.message}`);

      const { data: pub } = admin.storage.from("product-images").getPublicUrl(path);
      inserted.push({ path, sort_order: i, public_url: pub?.publicUrl ?? "" });
    }

    return new Response(JSON.stringify({ ok: true, product_id: productId, images: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-images error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

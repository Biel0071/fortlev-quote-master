// Lovable Cloud function: generate-category-image
// Generates a category thumbnail image using Lovable AI Gateway and stores it in the public bucket.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  categoryId: string;
  name?: string;
  slug?: string;
};

function buildPrompt(name: string) {
  // Keep it consistent with a storefront thumbnail: clean, centered, no text.
  return [
    `Ícone/thumbnail para categoria de loja de materiais de construção: ${name}.`,
    "Estilo: ilustração 3D limpa (clay style), centralizada, alto contraste, sem texto, sem logos.",
    "Fundo: neutro claro, com sombra suave.",
    "Composição: objeto principal bem legível em tamanho pequeno.",
    "Formato: quadrado.",
  ].join(" ");
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
    const categoryId = String(body?.categoryId ?? "").trim();
    if (!categoryId) {
      return new Response(JSON.stringify({ error: "categoryId_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client (service role) for storage upload + DB update
    const admin = createClient(url, service);

    const { data: cat, error: catErr } = await admin
      .from("store_categories")
      .select("id, name, slug")
      .eq("id", categoryId)
      .maybeSingle();

    if (catErr || !cat) {
      return new Response(JSON.stringify({ error: "category_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = String(cat.name ?? body?.name ?? "Categoria").trim();
    const slug = String(cat.slug ?? body?.slug ?? "categoria").trim() || "categoria";
    const prompt = buildPrompt(name);

    const genResp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        prompt,
        n: 1,
        size: "512x512",
      }),
    });

    if (!genResp.ok) {
      const t = await genResp.text();
      console.error("image generation error", genResp.status, t);
      return new Response(JSON.stringify({ error: "image_generation_failed", status: genResp.status }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const genPayload = await genResp.json();
    const imageUrl = genPayload?.data?.[0]?.url as string | undefined;
    if (!imageUrl) {
      console.error("image generation payload missing url", genPayload);
      return new Response(JSON.stringify({ error: "image_url_missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download image binary
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      const t = await imgResp.text();
      console.error("image download failed", imgResp.status, t);
      return new Response(JSON.stringify({ error: "image_download_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await imgResp.arrayBuffer());

    const path = `ai/${slug}/${Date.now()}-${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage.from("category-images").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "3600",
    });

    if (upErr) {
      console.error("storage upload error", upErr);
      return new Response(JSON.stringify({ error: "upload_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin.from("store_categories").update({ image_path: path }).eq("id", cat.id);
    if (updErr) {
      console.error("db update error", updErr);
      return new Response(JSON.stringify({ error: "db_update_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pub } = admin.storage.from("category-images").getPublicUrl(path);

    return new Response(
      JSON.stringify({ ok: true, image_path: path, public_url: pub?.publicUrl ?? "" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("generate-category-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

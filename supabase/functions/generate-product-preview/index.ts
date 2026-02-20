// Lovable Cloud function: generate-product-preview
// Creates a versioned AI preview for a draft product: 5 images + SEO description + 10 comments.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-platform-runtime, x-supabase-client-platform-runtime-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  productId: string;
};

const IMAGE_PROMPT_BASE =
  "High quality professional e-commerce product photo of {product_name}, neutral white background, studio lighting, realistic, sharp focus, no text, no watermark, multiple angles.";

const ANGLES = [
  "front view",
  "3/4 angle showing depth",
  "side view",
  "top view",
  "close-up detail (material/connection/texture)",
];

function buildImagePrompt(name: string, angle: string) {
  return IMAGE_PROMPT_BASE.replace("{product_name}", name) + ` Angle: ${angle}.`;
}

async function extractImageBytes(payload: any): Promise<Uint8Array> {
  // 1) Newer multimodal formats
  const msg = payload?.choices?.[0]?.message;

  const url1 = msg?.images?.[0]?.image_url?.url ?? msg?.images?.[0]?.url;
  if (typeof url1 === "string" && url1.length > 0) return await bytesFromUrlOrData(url1);

  // Some providers put image parts in message.content as an array
  const content = msg?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const u = part?.image_url?.url ?? part?.image_url ?? part?.url;
      if (typeof u === "string" && u.length > 0) return await bytesFromUrlOrData(u);

      const b64 = part?.b64_json ?? part?.image_base64 ?? part?.data;
      if (typeof b64 === "string" && b64.length > 0) return bytesFromBase64(b64);
    }
  }

  // Sometimes it comes as a string (may contain a data URL)
  if (typeof content === "string" && content.trim().length > 0) {
    const raw = content.trim();
    if (raw.startsWith("data:image")) return await bytesFromUrlOrData(raw);

    // Heuristic: if it looks like base64, try decoding
    if (/^[A-Za-z0-9+/=\n\r]+$/.test(raw) && raw.length > 1000) return bytesFromBase64(raw);
  }

  // 2) Legacy /images/generations formats (defensive)
  const first = payload?.data?.[0];
  const legacyUrl = first?.url;
  const legacyB64 = first?.b64_json;
  if (typeof legacyUrl === "string" && legacyUrl.length > 0) return await bytesFromUrlOrData(legacyUrl);
  if (typeof legacyB64 === "string" && legacyB64.length > 0) return bytesFromBase64(legacyB64);

  // Diagnostics: keep it small
  const topKeys = Object.keys(payload ?? {}).join(",");
  const choiceKeys = Object.keys(payload?.choices?.[0] ?? {}).join(",");
  const msgKeys = Object.keys(msg ?? {}).join(",");
  const contentType = Array.isArray(content) ? "array" : typeof content;

  throw new Error(`image_url_missing:top=${topKeys};choice=${choiceKeys};msg=${msgKeys};contentType=${contentType}`);
}

function bytesFromBase64(b64: string): Uint8Array {
  // Accept both pure base64 and data URLs
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  if (!clean) throw new Error("image_b64_missing");

  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function bytesFromUrlOrData(raw: string): Promise<Uint8Array> {
  // data:image/png;base64,...
  if (raw.startsWith("data:image")) {
    return bytesFromBase64(raw);
  }

  // Some gateways can return a plain base64 without header
  if (!raw.startsWith("http")) {
    return bytesFromBase64(raw);
  }

  const imgResp = await fetch(raw);
  if (!imgResp.ok) {
    const t = await imgResp.text();
    throw new Error(`image_download_failed:${imgResp.status}:${t}`);
  }
  return new Uint8Array(await imgResp.arrayBuffer());
}

async function aiGeneratePng({
  LOVABLE_API_KEY,
  prompt,
}: {
  LOVABLE_API_KEY: string;
  prompt: string;
}) {
  // Use the multimodal chat endpoint for image models (returns base64 data URLs)
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
  return await extractImageBytes(payload);
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function aiGenerateText({
  LOVABLE_API_KEY,
  productName,
}: {
  LOVABLE_API_KEY: string;
  productName: string;
}): Promise<{ description: string; comments: Array<{ author_name: string; rating: number; comment_text: string }> }> {
  const system =
    "You write Brazilian Portuguese e-commerce copy. Output MUST be valid JSON only, no markdown.";
  const user = [
    `Product name: ${productName}`,
    "Generate:",
    "1) description: SEO-optimized commercial tone, 2-3 paragraphs.",
    "2) comments: 10 realistic customer comments in pt-BR, mix short and medium, varied wording, no repetitive patterns.",
    "Return JSON schema:",
    "{\"description\": string, \"comments\": [{\"author_name\": string, \"rating\": 1-5, \"comment_text\": string}]}.",
  ].join("\n");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.8,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`text_generation_failed:${resp.status}:${t}`);
  }

  const payload = await resp.json();
  const raw = (payload?.choices?.[0]?.message?.content as string | undefined) ?? "";

  // Some models may wrap in ```json ...```
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = safeJsonParse<{ description?: unknown; comments?: unknown }>(cleaned);
  if (!parsed || typeof parsed.description !== "string" || !Array.isArray(parsed.comments)) {
    throw new Error("text_generation_invalid_json");
  }

  const comments = (parsed.comments as any[])
    .map((c) => ({
      author_name: String(c?.author_name ?? "Cliente"),
      rating: Math.max(1, Math.min(5, Number(c?.rating ?? 5) || 5)),
      comment_text: String(c?.comment_text ?? ""),
    }))
    .filter((c) => c.comment_text.trim().length > 0)
    .slice(0, 10);

  return { description: parsed.description, comments };
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

    // Caller client (RLS) to validate user + role
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
    if (!productId) {
      return new Response(JSON.stringify({ error: "productId_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client (service role) for DB writes + storage
    const admin = createClient(url, service);

    const { data: p, error: pErr } = await admin
      .from("store_products")
      .select("id, name, status")
      .eq("id", productId)
      .maybeSingle();

    if (pErr || !p) {
      return new Response(JSON.stringify({ error: "product_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allow preview generation for any product status (do NOT publish automatically, do NOT change status)
    // Previously restricted to draft only.


    // Determine next version
    const { data: maxRow } = await admin
      .from("product_ai_previews")
      .select("version")
      .eq("product_id", productId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = Math.max(1, Number((maxRow as any)?.version ?? 0) + 1);

    // Generate text first
    const { description, comments } = await aiGenerateText({
      LOVABLE_API_KEY,
      productName: String((p as any).name),
    });

    // Generate 5 images
    const safeId = String(productId).slice(0, 8);
    const now = Date.now();

    const generatedImages: Array<{ path: string; sort_order: number; public_url: string }> = [];

    for (let i = 0; i < 5; i++) {
      const angle = ANGLES[i] ?? `variation ${i + 1}`;
      const prompt = buildImagePrompt(String((p as any).name), angle);
      const pngBytes = await aiGeneratePng({ LOVABLE_API_KEY, prompt });
      const path = `ai/preview/${safeId}/v${nextVersion}/${now}-${crypto.randomUUID()}.png`;

      const { error: upErr } = await admin.storage.from("product-images").upload(path, pngBytes, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "3600",
      });
      if (upErr) throw new Error(`upload_failed:${upErr.message}`);

      const { data: pub } = admin.storage.from("product-images").getPublicUrl(path);
      generatedImages.push({ path, sort_order: i, public_url: pub?.publicUrl ?? "" });
    }

    const insertPayload = {
      product_id: productId,
      version: nextVersion,
      generated_description: description,
      generated_comments_json: comments as any,
      generated_images_json: generatedImages as any,
      approved: false,
    };

    const { data: preview, error: insErr } = await admin
      .from("product_ai_previews")
      .insert(insertPayload as any)
      .select("*")
      .single();

    if (insErr) throw new Error(`preview_insert_failed:${insErr.message}`);

    return new Response(JSON.stringify({ ok: true, preview }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-preview error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes("text_generation_failed:429") || msg.includes(":429:") ? 429 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  bucket: "category-images" | "banner-images";
  sourcePath: string;
  prompt: string;
  targetFolder?: string;
};

function bytesFromBase64(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function bytesFromUrlOrData(raw: string): Promise<Uint8Array> {
  if (raw.startsWith("data:image")) return bytesFromBase64(raw);
  if (!raw.startsWith("http")) return bytesFromBase64(raw);

  const imgResp = await fetch(raw);
  if (!imgResp.ok) throw new Error(`image_download_failed:${imgResp.status}`);
  return new Uint8Array(await imgResp.arrayBuffer());
}

async function extractImageBytes(payload: any): Promise<Uint8Array> {
  const msg = payload?.choices?.[0]?.message;
  const directUrl = msg?.images?.[0]?.image_url?.url ?? msg?.images?.[0]?.url;
  if (typeof directUrl === "string" && directUrl.length > 0) {
    return bytesFromUrlOrData(directUrl);
  }

  const content = msg?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const u = part?.image_url?.url ?? part?.image_url ?? part?.url;
      if (typeof u === "string" && u.length > 0) return bytesFromUrlOrData(u);

      const b64 = part?.b64_json ?? part?.image_base64 ?? part?.data;
      if (typeof b64 === "string" && b64.length > 0) return bytesFromBase64(b64);
    }
  }

  throw new Error("image_url_missing");
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
    const bucket = body?.bucket;
    const sourcePath = String(body?.sourcePath ?? "").trim();
    const prompt = String(body?.prompt ?? "").trim();
    const targetFolder = String(body?.targetFolder ?? "ai-edits").trim() || "ai-edits";

    if (!["category-images", "banner-images"].includes(bucket)) {
      return new Response(JSON.stringify({ error: "invalid_bucket" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sourcePath || !prompt) {
      return new Response(JSON.stringify({ error: "sourcePath_and_prompt_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, service);

    const { data: pub } = admin.storage.from(bucket).getPublicUrl(sourcePath);
    const sourceUrl = pub?.publicUrl;

    if (!sourceUrl) {
      return new Response(JSON.stringify({ error: "source_image_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${prompt}. Preserve product/banner realism and no text overlays unless requested.` },
              { type: "image_url", image_url: { url: sourceUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await aiResp.text();
      return new Response(JSON.stringify({ error: `ai_generation_failed:${text}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await aiResp.json();
    const imageBytes = await extractImageBytes(payload);

    const path = `${targetFolder}/${Date.now()}-${crypto.randomUUID()}.png`;
    const { error: uploadErr } = await admin.storage.from(bucket).upload(path, imageBytes, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: `upload_failed:${uploadErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: outPub } = admin.storage.from(bucket).getPublicUrl(path);

    return new Response(JSON.stringify({ ok: true, image_path: path, public_url: outPub?.publicUrl ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("edit-store-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

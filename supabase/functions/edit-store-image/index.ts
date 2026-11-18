import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateImageBytes, getAiGatewayConfig } from "../_shared/aiGateway.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    getAiGatewayConfig();

    if (!url || !anon || !service) throw new Error("Backend env vars missing");

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

    const imageBytes = await generateImageBytes(
      `${prompt}. Preserve product/banner realism and no text overlays unless requested.`,
      { image: sourceUrl, width: 1024, height: 1024 },
    );

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

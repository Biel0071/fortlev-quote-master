// Proxy para AI externa (Cloudflare Tunnel -> Ollama/ComfyUI local)
// POST body: { path: "/v1/text" | "/v1/chat" | "/v1/image" | ..., payload: {...} }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BASE_URL = Deno.env.get("EXTERNAL_AI_URL");
const API_KEY = Deno.env.get("EXTERNAL_AI_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BASE_URL || !API_KEY) {
      return new Response(JSON.stringify({ error: "external_ai_not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { path, payload } = await req.json();
    if (typeof path !== "string" || !path.startsWith("/")) {
      return new Response(JSON.stringify({ error: "invalid_path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

    const upstream = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(payload ?? {}),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    const msg = (e as Error)?.name === "AbortError" ? "upstream_timeout" : String((e as Error).message ?? e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Lovable Cloud function: click-track
// Persists clickstream events into public.visitor_tracking using service role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function safeToken(t: unknown) {
  const s = String(t ?? "").trim();
  if (s.length < 8 || s.length > 200) return null;
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE) throw new Error("Backend secrets not configured");

    const supa = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

    const body = (await req.json()) as any;
    const session_token = safeToken(body?.session_token);
    if (!session_token) throw new Error("Invalid session_token");

    const type = String(body?.type ?? "").trim();
    if (!type) throw new Error("Invalid type");

    const path = body?.path ? String(body.path) : null;
    const product_id = body?.product_id ? String(body.product_id) : null;
    const metadata = (body?.metadata ?? {}) as Record<string, unknown>;

    const { error } = await supa.from("visitor_tracking").insert({
      session_token,
      event_type: type,
      path,
      product_id,
      metadata: {
        ...(metadata ?? {}),
        timestamp: body?.timestamp ?? null,
      },
    } as any);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("click-track error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

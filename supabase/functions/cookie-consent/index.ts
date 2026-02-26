// Lovable Cloud function: cookie-consent
// Stores hashed consent audit into public.cookie_consent using service role.

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

function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return null;
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    const consent = String(body?.consent ?? "").trim();
    if (consent !== "accepted" && consent !== "declined") throw new Error("Invalid consent");

    const ip = getIp(req);
    const ua = req.headers.get("user-agent") ?? "";

    const ip_hash = ip ? await sha256Hex(ip) : null;
    const user_agent_hash = ua ? await sha256Hex(ua) : null;

    const { error } = await supa.from("cookie_consent").insert({
      session_token,
      consent,
      accepted_at: new Date().toISOString(),
      ip_hash,
      user_agent_hash,
    } as any);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cookie-consent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

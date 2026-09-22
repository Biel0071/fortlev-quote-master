import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "server_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const token = String((body as any).token ?? "").trim();
    const slug = String((body as any).slug ?? "").trim() || null;
    const deviceHash = String((body as any).device_hash ?? "").trim();
    const scope = String((body as any).access_scope ?? "").trim() || null;

    if (token.length < 8 || deviceHash.length < 8) {
      return new Response(JSON.stringify({ error: "Acesso inválido ou expirado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      null;
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    const cloud = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await cloud.rpc("validate_public_quotation_token", {
      _raw_token: token,
      _store_slug: slug,
      _device_hash: deviceHash,
      _ip: ip,
      _access_scope: scope,
      _user_agent: userAgent,
    });

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      return new Response(JSON.stringify({ error: error?.message ?? "Acesso inválido ou expirado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = Array.isArray(data) ? data[0] : data;

    const { error: lockError } = await cloud.rpc("enforce_token_ip_lock", {
      _token_id: result.token_id,
      _ip: ip,
      _is_first: Boolean(result.is_first_access),
      _user_agent: userAgent,
    });

    if (lockError) {
      return new Response(JSON.stringify({ error: lockError.message }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ access: result, ip_locked: Boolean(ip) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[quotation-token-validate]", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

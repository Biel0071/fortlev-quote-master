import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return null;
}

function asText(v: unknown) {
  return String(v ?? "").trim();
}

function asNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE) throw new Error("Backend secrets not configured");

    const cloud = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false },
    });

    const body = await req.json();

    const sessionId = asText(body?.session_id);
    const consentGiven = Boolean(body?.consent_given);
    const isPersistent = Boolean(body?.is_persistent);

    if (sessionId.length < 8 || sessionId.length > 200) {
      return new Response(JSON.stringify({ error: "session_id inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const routeType = asText(body?.route_type).toLowerCase();
    if (routeType !== "whatsapp" && routeType !== "gateway") {
      return new Response(JSON.stringify({ error: "route_type inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cartItems = Array.isArray(body?.cart_items) ? body.cart_items : [];
    const ip = consentGiven ? getIp(req) : null;
    const userAgent = consentGiven ? req.headers.get("user-agent") ?? null : null;

    const { data, error } = await cloud.rpc("upsert_checkout_session", {
      _session_id: sessionId,
      _consent_given: consentGiven,
      _is_persistent: isPersistent,
      _nome: asText(body?.nome),
      _telefone: asText(body?.telefone),
      _email: asText(body?.email),
      _cep: asText(body?.cep),
      _endereco: asText(body?.endereco),
      _numero: asText(body?.numero),
      _complemento: asText(body?.complemento),
      _observacoes: asText(body?.observacoes),
      _subtotal: asNumber(body?.subtotal),
      _total: asNumber(body?.total),
      _route_type: routeType,
      _cart_items: cartItems,
      _ip: ip,
      _user_agent: userAgent,
      _last_step: asText(body?.last_step) || "identify",
    } as never);

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;

    return new Response(
      JSON.stringify({
        ok: true,
        checkout_session_id: row?.checkout_session_id ?? null,
        customer_id: row?.customer_id ?? null,
        session_id: row?.session_id ?? sessionId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("checkout-session error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

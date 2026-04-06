import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type EventInput = {
  type: string;
  path?: string;
  product_id?: string | null;
  category_id?: string | null;
  duration?: number | null;
  metadata?: Record<string, unknown>;
};

function safeToken(t: unknown) {
  const s = String(t ?? "").trim();
  if (s.length < 8 || s.length > 200) return null;
  return s;
}

function safeText(v: unknown, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function classifyTemperature(score: number) {
  if (score >= 71) return "quente";
  if (score >= 31) return "morno";
  return "frio";
}

function normalizeDepth(raw: unknown) {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n)) return 0;
  if (n <= 1) return Math.max(0, Math.min(100, Math.round(n * 100)));
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function resolveUserIdFromJwt(req: Request, supabaseUrl: string, anonKey: string) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) return null;

    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data, error } = await anon.auth.getUser();
    if (error) return null;
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function hashIp(req: Request, consentOk: boolean): Promise<string | null> {
  if (!consentOk) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
  if (!ip) return null;
  try {
    const data = new TextEncoder().encode(ip + "_salt_lgpd_v1");
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

async function ensureSession(params: {
  supa: ReturnType<typeof createClient>;
  session_token: string;
  user_id: string | null;
  req: Request;
}) {
  const { supa, session_token, user_id, req } = params;
  const user_agent = safeText(req.headers.get("user-agent"), "unknown");
  const referrer = safeText(req.headers.get("referer"), "direct");

  const { error: upsertError } = await supa
    .from("tracking_sessions")
    .upsert(
      {
        session_token,
        user_id,
        last_seen_at: new Date().toISOString(),
        device: user_agent,
        source: referrer,
      },
      { onConflict: "session_token" },
    );

  if (upsertError) throw upsertError;

  const { data: session, error: sessionError } = await supa
    .from("tracking_sessions")
    .select("id, score, total_time_seconds, total_pages, total_clicks, scroll_depth")
    .eq("session_token", session_token)
    .single();

  if (sessionError) throw sessionError;
  return session as {
    id: string;
    score: number;
    total_time_seconds: number;
    total_pages: number;
    total_clicks: number;
    scroll_depth: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE || !SUPABASE_ANON_KEY) throw new Error("Backend secrets not configured");

    const supa = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false },
    });

    const body = (await req.json()) as any;
    const action = String(body?.action ?? "");

    if (action === "start_session" || action === "set_consent") {
      const session_token = safeToken(body?.session_token);
      if (!session_token) throw new Error("Invalid session_token");

      const user_id = await resolveUserIdFromJwt(req, SUPABASE_URL, SUPABASE_ANON_KEY);
      const session = await ensureSession({ supa, session_token, user_id, req });

      return new Response(JSON.stringify({ ok: true, session_id: session.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "track_event") {
      const session_token = safeToken(body?.session_token);
      if (!session_token) throw new Error("Invalid session_token");

      const ev = (body?.event ?? {}) as EventInput;
      const type = safeText(ev?.type);
      if (!type) throw new Error("Invalid event.type");

      const rateKey = `tracking:${session_token}`;
      const { data: allowed, error: rateError } = await supa.rpc("check_rate_limit", {
        _key: rateKey,
        _event_type: `track_event:${type}`,
        _window_seconds: 30,
        _max_hits: 120,
      });
      if (rateError) throw rateError;
      if (!allowed) {
        return new Response(JSON.stringify({ ok: false, rate_limited: true }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user_id = await resolveUserIdFromJwt(req, SUPABASE_URL, SUPABASE_ANON_KEY);
      const session = await ensureSession({ supa, session_token, user_id, req });

      const metadata = (ev?.metadata ?? {}) as Record<string, unknown>;
      const duration = ev?.duration == null ? 0 : Math.max(0, Math.floor(Number(ev.duration)));
      const scoreDelta = Math.max(0, Number((metadata as any)?.score_delta ?? 0));
      const depth = normalizeDepth((metadata as any)?.depth);

      const { error: eventError } = await supa.from("tracking_events").insert({
        session_id: session.id,
        type,
        product_id: ev?.product_id ?? null,
        category_id: ev?.category_id ?? null,
        path: ev?.path ? String(ev.path) : null,
        metadata,
      });
      if (eventError) throw eventError;

      const pageIncrement = type === "page_view" && duration === 0 ? 1 : 0;
      const clickIncrement = ["add_to_cart", "banner_click", "checkout_start", "request_quote", "search", "whatsapp_click"].includes(type) ? 1 : 0;

      const nextScore = Math.max(0, Number(session.score ?? 0) + scoreDelta);
      const nextTemperature = classifyTemperature(nextScore);
      const nextTotalTime = Math.max(0, Number(session.total_time_seconds ?? 0) + duration);
      const nextTotalPages = Math.max(0, Number(session.total_pages ?? 0) + pageIncrement);
      const nextTotalClicks = Math.max(0, Number(session.total_clicks ?? 0) + clickIncrement);
      const nextScrollDepth = Math.max(Number(session.scroll_depth ?? 0), depth);

      const { error: updateError } = await supa
        .from("tracking_sessions")
        .update({
          score: nextScore,
          temperature: nextTemperature,
          last_seen_at: new Date().toISOString(),
          total_time_seconds: nextTotalTime,
          total_pages: nextTotalPages,
          total_clicks: nextTotalClicks,
          scroll_depth: nextScrollDepth,
        })
        .eq("id", session.id);
      if (updateError) throw updateError;

      return new Response(JSON.stringify({ ok: true, score: nextScore, temperature: nextTemperature }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_chat_session") {
      const session_token = safeToken(body?.session_token);
      if (!session_token) throw new Error("Invalid session_token");

      const user_id = await resolveUserIdFromJwt(req, SUPABASE_URL, SUPABASE_ANON_KEY);
      const session = await ensureSession({ supa, session_token, user_id, req });

      const { data, error } = await supa
        .from("chat_sessions")
        .insert({
          session_token,
          score_snapshot: Number(session.score ?? 0),
          last_path: req.headers.get("referer") ?? null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, chat_session_id: data.id, score_snapshot: Number(session.score ?? 0) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "log_chat_message") {
      const chat_session_id = safeText(body?.chat_session_id);
      const role = safeText(body?.role);
      const content = safeText(body?.content);
      if (!chat_session_id) throw new Error("Invalid chat_session_id");
      if (role !== "user" && role !== "assistant") throw new Error("Invalid role");
      if (!content) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { error } = await supa.from("chat_messages").insert({
        chat_session_id,
        role,
        content,
      } as any);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "close_chat_session") {
      const chat_session_id = safeText(body?.chat_session_id);
      if (!chat_session_id) throw new Error("Invalid chat_session_id");

      const { error } = await supa
        .from("chat_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", chat_session_id);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-event error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

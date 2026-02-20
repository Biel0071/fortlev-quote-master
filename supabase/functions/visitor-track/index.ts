// Lovable Cloud function: visitor-track
// Stores sessions/events using service role. Respects consent: no PII and no detailed events when consent=false.

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

function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return null;
}

function safeToken(t: unknown) {
  const s = String(t ?? "").trim();
  if (s.length < 8 || s.length > 200) return null;
  return s;
}

function scoreDeltaForEvent(type: string) {
  switch (type) {
    case "add_cart":
      return 30;
    case "chat_open":
      return 25;
    case "request_quote":
      return 40;
    case "whatsapp_click":
      return 50;
    default:
      return 0;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE) throw new Error("Backend secrets not configured");

    const supa = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false },
    });

    const body = (await req.json()) as any;
    const action = String(body?.action ?? "");

    if (action === "start_session" || action === "set_consent") {
      const session_token = safeToken(body?.session_token);
      if (!session_token) throw new Error("Invalid session_token");

      const consent_given = Boolean(body?.consent_given);

      // Try to insert (ignore duplicates) to avoid race conditions on session start
      const payload: any = {
        session_token,
        consent_given,
        referrer: req.headers.get("referer") ?? null,
      };

      if (consent_given) {
        payload.ip = getIp(req);
        payload.user_agent = req.headers.get("user-agent") ?? null;
      }

      // NOTE: ignoreDuplicates prevents unique-constraint failures when multiple tabs start at once.
      const { error: insErr } = await supa
        .from("visitor_sessions")
        .insert(payload, { onConflict: "session_token", ignoreDuplicates: true } as any);
      if (insErr) throw insErr;

      // Fetch the session row
      const { data: existing, error: selErr } = await supa
        .from("visitor_sessions")
        .select("id, consent_given")
        .eq("session_token", session_token)
        .maybeSingle();
      if (selErr) throw selErr;
      if (!existing) throw new Error("Session not found");

      // Update consent (once accepted, keep accepted)
      const nextConsent = Boolean(existing.consent_given) || consent_given;
      const update: any = { consent_given: nextConsent };
      if (!existing.consent_given && nextConsent) {
        update.ip = getIp(req);
        update.user_agent = req.headers.get("user-agent") ?? null;
      }

      const { error: upErr } = await supa.from("visitor_sessions").update(update).eq("id", existing.id);
      if (upErr) throw upErr;

      return new Response(
        JSON.stringify({ ok: true, visitor_session_id: existing.id, consent_given: nextConsent }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "track_event") {
      const session_token = safeToken(body?.session_token);
      if (!session_token) throw new Error("Invalid session_token");
      const consent_given = Boolean(body?.consent_given);
      const ev = body?.event as EventInput;

      // If no consent: do not store detailed events.
      if (!consent_given) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure session exists
      const { data: sess, error: sessErr } = await supa
        .from("visitor_sessions")
        .select("id, score, score_flags, counters")
        .eq("session_token", session_token)
        .maybeSingle();
      if (sessErr) throw sessErr;
      if (!sess) throw new Error("Session not found");

      const type = String(ev?.type ?? "").trim();
      if (!type) throw new Error("Invalid event.type");

      const path = ev?.path ? String(ev.path) : null;
      const duration = ev?.duration == null ? null : Math.max(0, Math.floor(Number(ev.duration)));
      const metadata = (ev?.metadata ?? {}) as any;

      // Insert event
      const { error: insErr } = await supa.from("visitor_events").insert({
        session_id: session_token,
        event_name: type, // legacy
        type,
        path,
        product_id: ev?.product_id ?? null,
        category_id: ev?.category_id ?? null,
        duration,
        metadata,
      } as any);
      if (insErr) throw insErr;

      // Score logic (with flags)
      let score = Number(sess.score ?? 0);
      const flags = (sess.score_flags ?? {}) as Record<string, any>;
      const counters = (sess.counters ?? {}) as Record<string, any>;

      // counters
      counters[type] = Number(counters[type] ?? 0) + 1;

      // product distinct rule: +10 on 3rd product_view (once)
      if (type === "product_view" && ev?.product_id) {
        const set = new Set<string>(Array.isArray(counters.distinct_products) ? counters.distinct_products : []);
        set.add(String(ev.product_id));
        counters.distinct_products = Array.from(set);
        if (!flags.pv3 && set.size >= 3) {
          flags.pv3 = true;
          score += 10;
        }
      }

      // +20 if stayed > 60s on product (once)
      if (type === "product_view" && duration != null && duration >= 60 && !flags.pv60) {
        flags.pv60 = true;
        score += 20;
      }

      // base deltas
      score += scoreDeltaForEvent(type);

      // clamp
      if (score < 0) score = 0;

      const { error: upErr } = await supa
        .from("visitor_sessions")
        .update({ score, score_flags: flags, counters })
        .eq("id", sess.id);
      if (upErr) throw upErr;

      return new Response(JSON.stringify({ ok: true, score }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_chat_session") {
      const session_token = safeToken(body?.session_token);
      if (!session_token) throw new Error("Invalid session_token");

      const { data: sess, error: sessErr } = await supa
        .from("visitor_sessions")
        .select("id, score")
        .eq("session_token", session_token)
        .maybeSingle();
      if (sessErr) throw sessErr;

      const score_snapshot = Number(sess?.score ?? 0);
      const last_path = req.headers.get("referer") ?? null;

      const { data, error } = await supa
        .from("chat_sessions")
        .insert({
          visitor_session_id: sess?.id ?? null,
          session_token,
          score_snapshot,
          last_path,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, chat_session_id: data.id, score_snapshot }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "log_chat_message") {
      const chat_session_id = String(body?.chat_session_id ?? "").trim();
      const role = String(body?.role ?? "").trim();
      const content = String(body?.content ?? "").trim();
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
      const chat_session_id = String(body?.chat_session_id ?? "").trim();
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
    console.error("visitor-track error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

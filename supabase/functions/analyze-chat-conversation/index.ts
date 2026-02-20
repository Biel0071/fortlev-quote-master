// Lovable Cloud function: analyze-chat-conversation
// Uses Lovable AI Gateway via LOVABLE_API_KEY and stores insights for admins.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!SUPABASE_URL || !SERVICE) throw new Error("Backend secrets not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supa = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

    const { chat_session_id } = (await req.json()) as { chat_session_id?: string };
    const chatId = String(chat_session_id ?? "").trim();
    if (!chatId) throw new Error("chat_session_id is required");

    const { data: messages, error: msgErr } = await supa
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("chat_session_id", chatId)
      .order("created_at", { ascending: true });
    if (msgErr) throw msgErr;

    const transcript = (messages ?? [])
      .map((m: any) => `${m.role === "user" ? "Cliente" : "Assistente"}: ${m.content}`)
      .join("\n");

    const system = [
      "Você é um analista de conversas de e-commerce.",
      "Retorne APENAS JSON válido e estrito (sem markdown).",
      "Seja objetivo e útil para conversão.",
    ].join(" ");

    const prompt = [
      "Analise a conversa e gere insights.",
      "Campos obrigatórios (JSON):",
      "{",
      "  \"interest_level\": \"baixo\"|\"medio\"|\"alto\",",
      "  \"products_mentioned\": string[],",
      "  \"objections\": string[],",
      "  \"purchase_intent\": \"informativo\"|\"comparando\"|\"pronto_para_comprar\",",
      "  \"conversion_probability\": number,",
      "  \"emotional_tone\": string,",
      "  \"summary\": string,",
      "  \"recommended_next_actions\": string[]",
      "}",
      "Regras:",
      "- conversion_probability de 0 a 1.",
      "- Não invente dados pessoais.",
      "Transcrição:",
      transcript || "(vazia)",
    ].join("\n");

    const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!gatewayResp.ok) {
      const t = await gatewayResp.text();
      console.error("AI gateway error", gatewayResp.status, t);
      return new Response(JSON.stringify({ error: "gateway_error" }), {
        status: gatewayResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await gatewayResp.json();
    const content = payload?.choices?.[0]?.message?.content ?? "{}";

    let insight: any = { raw: content };
    try {
      insight = JSON.parse(String(content));
    } catch {
      insight = { raw: String(content) };
    }

    const { error: insErr } = await supa.from("chat_insights").insert({
      chat_session_id: chatId,
      insight_json: insight,
    } as any);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-chat-conversation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

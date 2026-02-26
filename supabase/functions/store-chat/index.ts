// Lovable Cloud function: store-chat
// Uses Lovable AI Gateway via LOVABLE_API_KEY.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Msg = { role: "user" | "assistant"; content: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { system, messages, input } = (await req.json()) as {
      system?: string;
      messages?: Msg[];
      input?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userText = String(input ?? "").trim();
    if (!userText) {
      return new Response(JSON.stringify({ answer: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
          { role: "system", content: system || "Você é um atendente virtual útil e objetivo." },
          ...(Array.isArray(messages) ? messages : []),
          { role: "user", content: userText },
        ],
      }),
    });

    if (!gatewayResp.ok) {
      if (gatewayResp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (gatewayResp.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const t = await gatewayResp.text();
      console.error("AI gateway error", gatewayResp.status, t);
      return new Response(JSON.stringify({ error: "gateway_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await gatewayResp.json();
    // log temporário para validar retorno da IA (somente backend)
    console.log("AI RESPONSE:", payload);

    const answer = payload?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("store-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

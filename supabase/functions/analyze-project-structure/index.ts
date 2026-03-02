// Lovable Cloud function: analyze-project-structure
// Uses Lovable AI Gateway via LOVABLE_API_KEY.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type InputFile = { path: string; content: string };
type Mode = "quick" | "deep";

function safeSlice(s: string, max: number) {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max) + "\n/* ...truncado... */\n";
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, scope, files } = (await req.json()) as {
      mode?: Mode;
      scope?: string;
      files?: InputFile[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const m: Mode = mode === "deep" ? "deep" : "quick";
    const sc = String(scope ?? "");
    const list = Array.isArray(files) ? files : [];

    const perFileCap = m === "deep" ? 12000 : 6000;
    const totalCap = m === "deep" ? 160000 : 80000;

    let total = 0;
    const prepared: Array<{ path: string; content: string; was_truncated: boolean }> = [];
    for (const f of list) {
      if (!f?.path) continue;
      const original = String(f.content ?? "");
      const sliced = safeSlice(original, perFileCap);
      const projected = total + sliced.length;
      if (projected > totalCap) break;

      prepared.push({
        path: String(f.path),
        content: sliced,
        was_truncated: sliced.length < original.length,
      });
      total = projected;
    }

    const system = "Você é um revisor técnico sênior. Produza um relatório ESTRUTURADO em JSON estrito.";

    const userPrompt = [
      `Analise os arquivos do projeto abaixo (escopo: ${sc}, modo: ${m}).`,
      "Retorne APENAS um JSON válido, sem markdown, sem texto extra.",
      "Formato obrigatório:",
      "{",
      '  "architecture_summary": string,',
      '  "improvement_points": string[],',
      '  "unused_files": string[],',
      '  "refactor_suggestions": string[],',
      '  "performance_notes": string[],',
      '  "security_notes": string[],',
      '  "risk_matrix": string[],',
      '  "action_plan": string[]',
      "}",
      "Regras:",
      "- Seja específico citando paths quando possível.",
      "- Não invente arquivos que não estão na lista.",
      "- Se não tiver certeza, marque como 'possível' nas sugestões.",
      "Arquivos:",
      JSON.stringify(prepared.map(({ path, content }) => ({ path, content }))),
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
          { role: "user", content: userPrompt },
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
    const rawReport = String(payload?.choices?.[0]?.message?.content ?? "{}");
    const parsedAnalysis = safeJsonParse(rawReport) ?? { raw_response: rawReport };

    const report = {
      generated_at: new Date().toISOString(),
      mode: m,
      scope: sc,
      files_received: list.length,
      files_analyzed: prepared.length,
      payload_chars: total,
      truncated: prepared.length < list.length || prepared.some((f) => f.was_truncated),
      analyzed_paths: prepared.map((f) => f.path),
      analysis: parsedAnalysis,
    };

    return new Response(JSON.stringify({ report_json: report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-project-structure error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

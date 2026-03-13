import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── AI Gateway ── */
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(apiKey: string, prompt: string, model = "google/gemini-2.5-flash"): Promise<string> {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI error ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/* ── Prompt for interpretation + description + tech sheet ── */
function buildEnrichPrompt(productName: string): string {
  return `Você é um especialista em materiais de construção e produtos de loja de construção civil.

Analise o seguinte nome de produto e retorne um JSON válido (sem markdown, sem \`\`\`, apenas o JSON puro):

Produto: "${productName}"

Retorne exatamente este formato JSON:
{
  "interpretation": {
    "tipo": "tipo do produto (ex: porcelanato, cimento, argamassa, tubo PVC, etc.)",
    "acabamento": "acabamento se aplicável (ex: retificado, brilhante, acetinado, fosco)",
    "cor": "cor principal",
    "tamanho": "dimensões se mencionadas",
    "marca": "marca se identificável",
    "material": "material principal",
    "categoria_sugerida": "categoria mais adequada (pisos, revestimentos, hidráulica, elétrica, tintas, ferramentas, cimentos e argamassas, madeiras, metais, etc.)"
  },
  "search_queries": [
    "query 1 em português para buscar imagem",
    "query 2 alternativa",
    "query 3 em inglês se útil"
  ],
  "description": "Descrição completa do produto com 3-4 parágrafos. Inclua: introdução sobre o produto, benefícios e características, aplicações recomendadas, e uma conclusão. Use linguagem profissional para e-commerce de materiais de construção. Mínimo 150 palavras.",
  "technical_sheet": {
    "Tipo": "valor",
    "Material": "valor",
    "Cor": "valor",
    "Dimensões": "valor",
    "Marca": "valor",
    "Acabamento": "valor",
    "Uso indicado": "valor",
    "Unidade de venda": "valor"
  }
}

IMPORTANTE:
- Se não conseguir identificar algum campo, coloque "Não especificado"
- A descrição deve ser rica e vendedora, para e-commerce
- A ficha técnica deve ter pelo menos 6 campos
- As queries de busca devem ser otimizadas para encontrar imagens reais do produto
- Retorne SOMENTE o JSON, sem texto adicional`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleOk } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!roleOk) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const action = body?.action ?? "enrich";

    if (action === "enrich") {
      const productId = body?.productId;
      const productName = body?.productName;

      if (!productId || !productName) {
        return new Response(JSON.stringify({ error: "missing productId or productName" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Call AI to interpret + generate description + tech sheet
      const aiResponse = await callAI(LOVABLE_API_KEY, buildEnrichPrompt(productName));

      // Parse JSON from response (handle possible markdown wrapping)
      let parsed: any;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("AI parse error:", e, "Raw:", aiResponse.slice(0, 500));
        return new Response(
          JSON.stringify({ error: "ai_parse_error", raw: aiResponse.slice(0, 300) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const description = parsed?.description ?? "";
      const techSheet = parsed?.technical_sheet ?? {};
      const interpretation = parsed?.interpretation ?? {};
      const searchQueries = Array.isArray(parsed?.search_queries) ? parsed.search_queries : [];

      // Build full description with tech sheet appended as markdown
      let fullDescription = description;
      if (Object.keys(techSheet).length > 0) {
        fullDescription += "\n\n## Ficha Técnica\n\n";
        for (const [key, val] of Object.entries(techSheet)) {
          fullDescription += `- **${key}:** ${val}\n`;
        }
      }

      // Update product in DB
      const updatePayload: Record<string, any> = {
        description: fullDescription,
      };

      // Update category if we got a suggestion and product has no category
      if (interpretation.categoria_sugerida && interpretation.categoria_sugerida !== "Não especificado") {
        // Try to find matching category
        const { data: catRow } = await admin
          .from("store_categories")
          .select("id, name")
          .ilike("name", `%${interpretation.categoria_sugerida}%`)
          .limit(1)
          .maybeSingle();

        if (catRow) {
          updatePayload.category = catRow.name;
          updatePayload.category_id = catRow.id;
        } else {
          updatePayload.category = interpretation.categoria_sugerida;
        }
      }

      // Set status to published if it was draft
      updatePayload.status = "published";

      const { error: updateErr } = await admin
        .from("store_products")
        .update(updatePayload)
        .eq("id", productId);

      if (updateErr) {
        console.error("Product update error:", updateErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          interpretation,
          searchQueries,
          description: fullDescription,
          techSheet,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "invalid_action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("enrich-products error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

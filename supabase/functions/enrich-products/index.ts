import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── AI Gateway ── */
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MAX_CONCURRENT = 3;
let activeAICalls = 0;
const aiQueue: Array<{ resolve: () => void }> = [];

async function acquireAISlot(): Promise<void> {
  if (activeAICalls < AI_MAX_CONCURRENT) {
    activeAICalls++;
    return;
  }
  return new Promise<void>((resolve) => {
    aiQueue.push({ resolve });
  });
}

function releaseAISlot() {
  activeAICalls--;
  const next = aiQueue.shift();
  if (next) {
    activeAICalls++;
    next.resolve();
  }
}

/* ── Robust JSON sanitizer ── */
function sanitizeJSON(response: string): unknown {
  // Remove markdown code blocks
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find JSON boundaries
  const jsonStart = cleaned.search(/[\{\[]/);
  if (jsonStart === -1) throw new Error("No JSON object or array found in response");

  const openChar = cleaned[jsonStart];
  const closeChar = openChar === "[" ? "]" : "}";
  const jsonEnd = cleaned.lastIndexOf(closeChar);
  if (jsonEnd === -1) throw new Error("Mismatched JSON structure in response");

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  // Attempt direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("Direct JSON parse failed, attempting repair:", e);
    // Fix common issues
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
      .replace(/\\'/g, "'");

    try {
      return JSON.parse(cleaned);
    } catch (repairError) {
      console.error("JSON repair failed:", repairError);
      throw new Error("Failed to parse and repair JSON response");
    }
  }
}

/* ── AI call with retry and concurrency control ── */
async function callAIWithRetry(
  apiKey: string,
  prompt: string,
  model = "google/gemini-2.5-flash",
  maxRetries = 3,
): Promise<unknown> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await acquireAISlot();
    try {
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

      if (resp.status === 429) {
        const txt = await resp.text();
        releaseAISlot();
        if (attempt < maxRetries - 1) {
          const delay = [5000, 10000, 20000][attempt] ?? 20000;
          console.warn(`Rate limited (429), retry ${attempt + 1} in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new Error(`AI rate limited after ${maxRetries} retries: ${txt.slice(0, 200)}`);
      }

      if (!resp.ok) {
        const txt = await resp.text();
        releaseAISlot();
        throw new Error(`AI error ${resp.status}: ${txt.slice(0, 300)}`);
      }

      const data = await resp.json();
      releaseAISlot();
      const content = data?.choices?.[0]?.message?.content ?? "";
      return sanitizeJSON(content);
    } catch (err: any) {
      if (activeAICalls > 0) releaseAISlot();
      if (err.message?.includes("rate limited") || err.message?.includes("429")) {
        if (attempt < maxRetries - 1) {
          const delay = [5000, 10000, 20000][attempt] ?? 20000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
      if (attempt === maxRetries - 1) throw err;
    }
  }
  throw new Error("AI call failed after maximum retries");
}

/* ── Simple hash for product name ── */
function hashProductName(name: string): string {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, " ");
  // Simple hash using charCode sums + length
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const chr = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${normalized.length}`;
}

/* ── Enhanced prompt with layered search queries and image filters ── */
function buildEnrichPrompt(productName: string): string {
  return `Você é um especialista em materiais de construção, cerâmicas, porcelanatos, metais sanitários e produtos de loja de construção civil.

Analise o seguinte nome de produto e retorne um JSON válido (sem markdown, sem \`\`\`, apenas o JSON puro):

Produto: "${productName}"

Retorne exatamente este formato JSON:
{
  "interpretation": {
    "tipo": "tipo exato do produto (ex: cerâmica de piso, porcelanato retificado, registro de pressão, acabamento cromado, válvula de descarga, argamassa colante, tubo PVC, etc.)",
    "marca": "marca do fabricante se identificável (ex: Cerâmica Almeida, Portobello, Eliane, Deca, Docol, Tigre, Quartzolit, etc.)",
    "modelo": "modelo ou código/referência do produto se presente no nome",
    "acabamento": "acabamento se aplicável (ex: retificado, acetinado, brilhante, fosco, cromado, escovado, polido, satinado, mate, natural, etc.)",
    "cor": "cor principal do produto",
    "tamanho": "dimensões se mencionadas (ex: 50x50, 62x62, 3/4, 1/2, etc.)",
    "material": "material principal (cerâmica, porcelana, metal, PVC, cimento, aço, etc.)",
    "categoria_sugerida": "categoria mais adequada (pisos, revestimentos, hidráulica, elétrica, tintas, ferramentas, cimentos e argamassas, madeiras, metais e louças, etc.)"
  },
  "search_queries_layered": {
    "manufacturer": [
      "query 1 para buscar no site do fabricante (usar marca + modelo/referência)",
      "query 2 alternativa do fabricante (marca + tipo + tamanho)"
    ],
    "marketplace": [
      "query 1 para buscar em marketplaces como Leroy Merlin, Telhanorte, C&C (tipo + marca + tamanho + acabamento)",
      "query 2 alternativa para Mercado Livre ou Amazon"
    ],
    "general": [
      "query 1 busca geral focada no produto isolado (tipo + cor + tamanho + 'produto isolado')",
      "query 2 em inglês se útil (ex: 'ceramic tile texture 50x50 gray satin')"
    ]
  },
  "image_acceptance_terms": ["termos que indicam imagem válida do produto, ex: tile sample, ceramic tile, produto isolado, fundo branco, textura"],
  "image_rejection_terms": ["termos que indicam imagem de ambiente/decoração, ex: kitchen, bathroom, living room, sala decorada, cozinha, banheiro, showroom, interior design, room"],
  "ai_image_prompt": "Prompt em inglês para gerar uma imagem realista do produto caso nenhuma imagem real seja encontrada. Deve descrever: textura, cor, formato, acabamento, visão superior, peça isolada em fundo branco. Exemplo: 'Photorealistic top-down view of a single 50x50cm satin finish gray ceramic floor tile on a pure white background, showing realistic surface texture and edges, product photography style'",
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

REGRAS IMPORTANTES:
- Se não conseguir identificar algum campo, coloque "Não especificado"
- A descrição deve ser rica e vendedora, para e-commerce
- A ficha técnica deve ter pelo menos 6 campos
- As queries do fabricante devem ser as mais específicas possíveis (marca + código/referência)
- As queries de marketplace devem incluir o tipo do produto + marca + dimensão
- As queries gerais devem focar em encontrar a PEÇA ISOLADA, não ambientes decorados
- Os termos de rejeição devem incluir palavras em PT e EN que indicam fotos de ambientes
- O prompt de geração IA deve criar uma textura/peça REALISTA, vista de cima, isolada em fundo branco
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

      // Check interpretation cache first
      const nameHash = hashProductName(productName);
      const { data: cachedInterp } = await admin
        .from("cache_product_interpretation")
        .select("*")
        .eq("product_name_hash", nameHash)
        .maybeSingle();

      let interpretation: any;
      let searchQueriesLayered: any;
      let imageAcceptanceTerms: string[];
      let imageRejectionTerms: string[];
      let aiImagePrompt: string;
      let fullDescription: string;
      let techSheet: any;

      if (cachedInterp) {
        console.log("Cache hit for product interpretation:", productName);
        interpretation = cachedInterp.interpretation;
        searchQueriesLayered = cachedInterp.search_queries_layered;
        imageAcceptanceTerms = Array.isArray(cachedInterp.image_acceptance_terms) ? cachedInterp.image_acceptance_terms as string[] : [];
        imageRejectionTerms = Array.isArray(cachedInterp.image_rejection_terms) ? cachedInterp.image_rejection_terms as string[] : [];
        aiImagePrompt = cachedInterp.ai_image_prompt ?? "";
        fullDescription = cachedInterp.description ?? "";
        techSheet = cachedInterp.technical_sheet ?? {};
      } else {
        // Call AI with retry and concurrency control
        let parsed: any;
        try {
          parsed = await callAIWithRetry(LOVABLE_API_KEY, buildEnrichPrompt(productName));
        } catch (e: any) {
          console.error("AI enrichment failed after retries:", e.message);
          // Return partial success - pipeline continues
          return new Response(
            JSON.stringify({
              success: false,
              error: "ai_parse_error",
              message: e.message?.slice(0, 300),
              // Return empty but valid structure so pipeline doesn't break
              interpretation: {},
              searchQueries: [],
              searchQueriesLayered: {},
              imageAcceptanceTerms: [],
              imageRejectionTerms: [],
              aiImagePrompt: "",
              description: "",
              techSheet: {},
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const description = parsed?.description ?? "";
        techSheet = parsed?.technical_sheet ?? {};
        interpretation = parsed?.interpretation ?? {};
        searchQueriesLayered = parsed?.search_queries_layered ?? {};
        imageAcceptanceTerms = Array.isArray(parsed?.image_acceptance_terms) ? parsed.image_acceptance_terms : [];
        imageRejectionTerms = Array.isArray(parsed?.image_rejection_terms) ? parsed.image_rejection_terms : [];
        aiImagePrompt = parsed?.ai_image_prompt ?? "";

        // Build full description with tech sheet
        fullDescription = description;
        if (Object.keys(techSheet).length > 0) {
          fullDescription += "\n\n## Ficha Técnica\n\n";
          for (const [key, val] of Object.entries(techSheet)) {
            fullDescription += `- **${key}:** ${val}\n`;
          }
        }

        // Save to interpretation cache (fire and forget)
        admin
          .from("cache_product_interpretation")
          .upsert({
            product_name_hash: nameHash,
            product_name: productName,
            interpretation,
            search_queries_layered: searchQueriesLayered,
            image_acceptance_terms: imageAcceptanceTerms,
            image_rejection_terms: imageRejectionTerms,
            ai_image_prompt: aiImagePrompt,
            description: fullDescription,
            technical_sheet: techSheet,
          }, { onConflict: "product_name_hash" })
          .then(() => console.log("Interpretation cached for:", productName))
          .catch((err: any) => console.warn("Cache save failed:", err.message));
      }

      // Flatten layered queries
      const allSearchQueries: string[] = [
        ...(Array.isArray(searchQueriesLayered?.manufacturer) ? searchQueriesLayered.manufacturer : []),
        ...(Array.isArray(searchQueriesLayered?.marketplace) ? searchQueriesLayered.marketplace : []),
        ...(Array.isArray(searchQueriesLayered?.general) ? searchQueriesLayered.general : []),
      ];

      // Update product in DB
      const updatePayload: Record<string, any> = {};
      if (fullDescription) updatePayload.description = fullDescription;

      if (interpretation?.categoria_sugerida && interpretation.categoria_sugerida !== "Não especificado") {
        try {
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
        } catch { /* category lookup failed, skip */ }
      }

      updatePayload.status = "published";

      try {
        await admin.from("store_products").update(updatePayload).eq("id", productId);
      } catch (e: any) {
        console.error("Product update error:", e.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          interpretation,
          searchQueries: allSearchQueries,
          searchQueriesLayered,
          imageAcceptanceTerms,
          imageRejectionTerms,
          aiImagePrompt,
          description: fullDescription,
          techSheet,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── AI Image Generation Fallback — DISABLED ── */
    /* Products with 6-8 search images are sufficient; no AI generation needed */
    if (action === "generate-image") {
      console.log("AI image generation skipped (disabled) for product:", body?.productId);
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "ai_image_generation_disabled",
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

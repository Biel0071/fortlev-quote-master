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

      // Call AI to interpret + generate description + tech sheet + layered queries
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
      const searchQueriesLayered = parsed?.search_queries_layered ?? {};
      const imageAcceptanceTerms = Array.isArray(parsed?.image_acceptance_terms) ? parsed.image_acceptance_terms : [];
      const imageRejectionTerms = Array.isArray(parsed?.image_rejection_terms) ? parsed.image_rejection_terms : [];
      const aiImagePrompt = parsed?.ai_image_prompt ?? "";

      // Flatten layered queries for backward compatibility
      const allSearchQueries: string[] = [
        ...(Array.isArray(searchQueriesLayered.manufacturer) ? searchQueriesLayered.manufacturer : []),
        ...(Array.isArray(searchQueriesLayered.marketplace) ? searchQueriesLayered.marketplace : []),
        ...(Array.isArray(searchQueriesLayered.general) ? searchQueriesLayered.general : []),
      ];

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

    /* ── AI Image Generation Fallback ── */
    if (action === "generate-image") {
      const productId = body?.productId;
      const prompt = body?.prompt;

      if (!productId || !prompt) {
        return new Response(JSON.stringify({ error: "missing productId or prompt" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Generating AI image for product:", productId);

      const imgResp = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResp.ok) {
        const txt = await imgResp.text();
        console.error("AI image generation error:", imgResp.status, txt.slice(0, 300));
        return new Response(
          JSON.stringify({ error: "ai_image_generation_failed", status: imgResp.status }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const imgData = await imgResp.json();
      const imageB64 = imgData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageB64 || !imageB64.startsWith("data:image")) {
        return new Response(
          JSON.stringify({ error: "no_image_in_response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract base64 data and upload to storage
      const base64Match = imageB64.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!base64Match) {
        return new Response(
          JSON.stringify({ error: "invalid_base64_format" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
      const rawB64 = base64Match[2];

      // Decode base64 to Uint8Array
      const binaryStr = atob(rawB64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const safeProductId = productId.slice(0, 8);
      const path = `ai-generated/${safeProductId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await admin.storage.from("product-images").upload(path, bytes, {
        contentType: `image/${base64Match[1]}`,
        upsert: false,
        cacheControl: "3600",
      });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        return new Response(
          JSON.stringify({ error: "upload_failed", detail: uploadErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get max sort_order for this product
      const { data: maxSortRow } = await admin
        .from("store_product_images")
        .select("sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sortOrder = Number(maxSortRow?.sort_order ?? -1) + 1;

      const { error: insertErr } = await admin.from("store_product_images").insert({
        product_id: productId,
        path,
        sort_order: sortOrder,
      } as any);

      if (insertErr) {
        await admin.storage.from("product-images").remove([path]);
        return new Response(
          JSON.stringify({ error: "db_insert_failed", detail: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: publicData } = admin.storage.from("product-images").getPublicUrl(path);

      return new Response(
        JSON.stringify({
          success: true,
          path,
          public_url: publicData.publicUrl,
          sort_order: sortOrder,
          generated: true,
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

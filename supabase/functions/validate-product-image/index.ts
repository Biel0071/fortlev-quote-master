import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_BLACKLIST = ["logo", "banner", "icon", "sprite", "placeholder", "selo", "badge", "marca-dagua", "marca_dagua", "watermark"];

function isBlacklistedUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return IMAGE_BLACKLIST.some((w) => lower.includes(w));
}

async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const resp = await fetch(url, { method: "HEAD" });
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    // We can't easily get dimensions from HEAD, so we'll fetch a small portion
    // For simplicity, we'll skip dimension check for URLs and rely on AI analysis
    return { width: 600, height: 600 }; // assume valid if reachable
  } catch {
    return null;
  }
}

async function analyzeImageWithAI(
  imageUrl: string,
  productName: string,
  category: string
): Promise<{ confidence: number; analysis: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { confidence: 0.5, analysis: "AI key not configured, using default confidence" };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em validação de imagens de produtos de materiais de construção.
Analise a imagem e determine se ela corresponde ao produto informado.

Responda APENAS em JSON com este formato:
{"confidence": 0.0 a 1.0, "analysis": "explicação curta", "matches_product": true/false}

Critérios de avaliação:
- A imagem mostra o produto real? (não um logo, banner, ou foto genérica)
- O formato/tipo do produto na imagem é compatível com o nome?
- A cor e material são consistentes?
- É uma foto de produto isolado ou em contexto de uso adequado?

Produtos similares são aceitáveis:
- "cimento" e "saco de cimento" = OK
- "argamassa" e "saco de argamassa" = OK
- "bloco" e "blocos empilhados" = OK

Imagens INVÁLIDAS:
- Logos de marcas
- Fotos de lojas/obras sem o produto em destaque
- Banners promocionais
- Imagens genéricas sem relação`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Produto: "${productName}"\nCategoria: "${category}"\n\nEsta imagem corresponde a este produto?`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return { confidence: 0.5, analysis: `AI error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
          analysis: parsed.analysis || "Análise concluída",
        };
      } catch {
        return { confidence: 0.5, analysis: content.slice(0, 200) };
      }
    }

    return { confidence: 0.5, analysis: content.slice(0, 200) };
  } catch (err) {
    console.error("AI analysis error:", err);
    return { confidence: 0.5, analysis: `Error: ${err}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { product_id, product_name, category, image_urls, auto_approve } = await req.json();

    if (!product_id || !product_name || !image_urls?.length) {
      return new Response(JSON.stringify({ error: "product_id, product_name, and image_urls required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const results: Array<{
      url: string;
      confidence: number;
      status: string;
      analysis: string;
    }> = [];

    for (const url of image_urls.slice(0, 10)) {
      // Step 1: Blacklist filter
      if (isBlacklistedUrl(url)) {
        results.push({ url, confidence: 0, status: "rejected", analysis: "URL contém palavra proibida" });
        continue;
      }

      // Step 2: Check image accessibility
      const dims = await getImageDimensions(url);
      if (!dims) {
        results.push({ url, confidence: 0, status: "rejected", analysis: "Imagem inacessível" });
        continue;
      }

      // Step 3: AI analysis
      const { confidence, analysis } = await analyzeImageWithAI(url, product_name, category || "");

      let status: string;
      if (confidence >= 0.7) {
        status = auto_approve ? "approved" : "pending";
      } else if (confidence >= 0.4) {
        status = "pending";
      } else {
        status = "rejected";
      }

      // Save to review queue
      await sb.from("image_review_queue").insert({
        product_id,
        image_url: url,
        source: "ai_validation",
        confidence,
        ai_analysis: analysis,
        status,
      });

      // If auto-approve and high confidence, download and save
      if (status === "approved" && auto_approve) {
        try {
          const imgResp = await fetch(url);
          if (imgResp.ok) {
            const blob = await imgResp.blob();
            const ext = url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || "jpg";
            const path = `products/${product_id}/${crypto.randomUUID()}.${ext}`;

            await sb.storage.from("product-images").upload(path, blob, {
              contentType: blob.type || `image/${ext}`,
              upsert: false,
            });

            await sb.from("store_product_images").insert({
              product_id,
              path,
              sort_order: 0,
            });

            // Update queue entry with path
            await sb.from("image_review_queue")
              .update({ image_path: path })
              .eq("image_url", url)
              .eq("product_id", product_id);
          }
        } catch (e) {
          console.error("Auto-download error:", e);
        }
      }

      // Log to system_memory
      await sb.from("system_memory").insert({
        event: "image_validation",
        entity: "product",
        entity_id: product_id,
        impact: confidence >= 0.7 ? "low" : confidence >= 0.4 ? "medium" : "high",
        details: { url, confidence, status, analysis },
      });

      results.push({ url, confidence, status, analysis });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("validate-product-image error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

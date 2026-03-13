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
    if (!SUPABASE_URL || !SERVICE) throw new Error("Missing backend config");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supa = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
    const body = await req.json();
    const action = String(body?.action ?? "generate");

    if (action === "generate") {
      const productIds: string[] = body?.product_ids ?? [];
      const count = Math.min(Math.max(1, Number(body?.count ?? 3)), 8);

      if (!productIds.length) throw new Error("No product_ids provided");

      const results: Array<{ product_id: string; reviews_created: number; error?: string }> = [];

      for (const productId of productIds) {
        try {
          const { data: product } = await supa
            .from("store_products")
            .select("id, name, category, description, price, unit")
            .eq("id", productId)
            .single();

          if (!product) { results.push({ product_id: productId, reviews_created: 0, error: "Product not found" }); continue; }

          const prompt = `Você é um gerador de avaliações realistas de clientes para uma loja de materiais de construção.

Produto: ${product.name}
Categoria: ${product.category || "Geral"}
Preço: R$ ${product.price}
Unidade: ${product.unit || "un"}
Descrição: ${(product.description || "").slice(0, 500)}

Gere ${count} avaliações REALISTAS de clientes brasileiros. Cada avaliação deve ser única e parecer autêntica.

Varie:
- Ratings entre 3 e 5 estrelas (maioria 4-5)
- Nomes brasileiros diversos (homens e mulheres)
- Cidades brasileiras variadas
- Perspectivas diferentes (profissional de obra, DIY, empreiteiro)
- Comprimento dos textos (curtos e longos)
- Alguns com prós e contras, outros só com texto

Retorne APENAS um JSON array sem markdown:
[{
  "author_name": "Nome Sobrenome",
  "author_location": "Cidade - UF",
  "rating": 5,
  "title": "Título curto da avaliação",
  "content": "Texto da avaliação...",
  "pros": "Pontos positivos ou null",
  "cons": "Pontos negativos ou null",
  "verified_purchase": true
}]`;

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (!aiResp.ok) {
            const errText = await aiResp.text();
            results.push({ product_id: productId, reviews_created: 0, error: `AI error ${aiResp.status}: ${errText.slice(0, 200)}` });
            continue;
          }

          const aiData = await aiResp.json();
          const rawContent = aiData.choices?.[0]?.message?.content ?? "[]";
          const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
          if (!jsonMatch) { results.push({ product_id: productId, reviews_created: 0, error: "Failed to parse AI response" }); continue; }

          const reviews = JSON.parse(jsonMatch[0]) as Array<{
            author_name: string;
            author_location?: string;
            rating: number;
            title?: string;
            content: string;
            pros?: string;
            cons?: string;
            verified_purchase?: boolean;
          }>;

          const rows = reviews.map((r) => ({
            product_id: productId,
            author_name: String(r.author_name || "Cliente").slice(0, 100),
            author_location: r.author_location ? String(r.author_location).slice(0, 80) : null,
            rating: Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5))),
            title: r.title ? String(r.title).slice(0, 200) : null,
            content: String(r.content || "").slice(0, 2000),
            pros: r.pros ? String(r.pros).slice(0, 500) : null,
            cons: r.cons ? String(r.cons).slice(0, 500) : null,
            verified_purchase: r.verified_purchase ?? true,
            approved: false,
            origin: "ai_generated",
          }));

          const { error: insertErr } = await supa.from("product_reviews").insert(rows);
          if (insertErr) { results.push({ product_id: productId, reviews_created: 0, error: insertErr.message }); continue; }

          results.push({ product_id: productId, reviews_created: rows.length });
        } catch (e) {
          results.push({ product_id: productId, reviews_created: 0, error: e instanceof Error ? e.message : "Unknown" });
        }
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const reviewIds: string[] = body?.review_ids ?? [];
      if (!reviewIds.length) throw new Error("No review_ids");

      const { error } = await supa.from("product_reviews").update({ approved: true, updated_at: new Date().toISOString() }).in("id", reviewIds);
      if (error) throw error;

      // Recalculate rating summaries for affected products
      const { data: reviews } = await supa.from("product_reviews").select("product_id").in("id", reviewIds);
      const productIds = [...new Set((reviews ?? []).map((r: any) => r.product_id))];
      for (const pid of productIds) {
        await supa.rpc("recalculate_rating_summary", { _product_id: pid });
      }

      return new Response(JSON.stringify({ ok: true, approved: reviewIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      const reviewIds: string[] = body?.review_ids ?? [];
      if (!reviewIds.length) throw new Error("No review_ids");
      const { error } = await supa.from("product_reviews").delete().in("id", reviewIds);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, deleted: reviewIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-reviews error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

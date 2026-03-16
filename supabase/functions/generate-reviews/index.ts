import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ---------- helpers ---------- */

async function logEvent(supa: any, level: string, message: string, meta: Record<string, any> = {}) {
  try {
    await supa.from("system_event_logs").insert({
      level,
      event_type: "review_generation",
      source: "review-system",
      message,
      metadata: meta,
    });
  } catch { /* best-effort */ }
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/* ---------- main ---------- */

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

    /* ============================================================ */
    /*  GENERATE                                                     */
    /* ============================================================ */
    if (action === "generate") {
      const productIds: string[] = body?.product_ids ?? [];
      const count = Math.min(Math.max(1, Number(body?.count ?? 3)), 8);
      const isDailyJob = body?.daily_job === true;

      if (!productIds.length) throw new Error("No product_ids provided");

      await logEvent(supa, "info", `Geração iniciada: ${productIds.length} produtos × ${count} reviews`, {
        product_count: productIds.length,
        reviews_per_product: count,
        daily_job: isDailyJob,
      });

      const results: Array<{ product_id: string; reviews_created: number; error?: string }> = [];
      const BATCH_SIZE = 5;

      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (productId) => {
          try {
            const { data: product } = await supa
              .from("store_products")
              .select("id, name, category, description, price, unit")
              .eq("id", productId)
              .single();

            if (!product) {
              results.push({ product_id: productId, reviews_created: 0, error: "Product not found" });
              return;
            }

            // Check existing review count
            const { count: existingCount } = await supa
              .from("product_reviews")
              .select("id", { count: "exact", head: true })
              .eq("product_id", productId);

            if ((existingCount ?? 0) >= 250) {
              results.push({ product_id: productId, reviews_created: 0, error: "Max 250 reviews reached" });
              return;
            }

            const remainingSlots = 250 - (existingCount ?? 0);
            const actualCount = Math.min(count, remainingSlots);

            const prompt = `Você é um gerador de avaliações realistas de clientes para uma loja de materiais de construção.

Produto: ${product.name}
Categoria: ${product.category || "Geral"}
Preço: R$ ${product.price}
Unidade: ${product.unit || "un"}
Descrição: ${(product.description || "").slice(0, 500)}

Gere ${actualCount} avaliações REALISTAS de clientes brasileiros. Cada avaliação deve ser única e parecer autêntica.

Regras obrigatórias:
- Ratings: distribuição realista (60% nota 5, 25% nota 4, 10% nota 3, 5% nota 2-1)
- Nomes brasileiros diversos (homens e mulheres, diferentes regiões)
- Cidades brasileiras variadas de todo o Brasil
- Perspectivas: pedreiro, mestre de obras, engenheiro, DIY, dono de obra, empreiteiro, arquiteto
- Variar comprimento: 30% curtos (1-2 linhas), 50% médios (3-5 linhas), 20% longos (6+ linhas)
- Mencionar aspectos técnicos reais do produto quando possível
- Incluir prós e contras em ~40% das avaliações (o resto null)
- Usar linguagem natural, coloquial brasileira, sem ser formal demais

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
              return;
            }

            const aiData = await aiResp.json();
            const rawContent = aiData.choices?.[0]?.message?.content ?? "[]";
            const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
              results.push({ product_id: productId, reviews_created: 0, error: "Failed to parse AI response" });
              return;
            }

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

            // Randomize creation dates over last 90 days for natural appearance
            const now = Date.now();
            const rows = reviews.map((r) => {
              const daysAgo = Math.floor(Math.random() * 90);
              const hoursAgo = Math.floor(Math.random() * 24);
              const created = new Date(now - (daysAgo * 86400000) - (hoursAgo * 3600000));

              return {
                product_id: productId,
                author_name: String(r.author_name || "Cliente").slice(0, 100),
                author_location: r.author_location ? String(r.author_location).slice(0, 80) : null,
                rating: Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5))),
                title: r.title ? String(r.title).slice(0, 200) : null,
                content: String(r.content || "").slice(0, 2000),
                pros: r.pros && r.pros !== "null" ? String(r.pros).slice(0, 500) : null,
                cons: r.cons && r.cons !== "null" ? String(r.cons).slice(0, 500) : null,
                verified_purchase: r.verified_purchase ?? true,
                approved: false,
                origin: "ai_generated",
                created_at: created.toISOString(),
              };
            });

            const { error: insertErr } = await supa.from("product_reviews").insert(rows);
            if (insertErr) {
              results.push({ product_id: productId, reviews_created: 0, error: insertErr.message });
              return;
            }

            results.push({ product_id: productId, reviews_created: rows.length });
          } catch (e) {
            results.push({ product_id: productId, reviews_created: 0, error: e instanceof Error ? e.message : "Unknown" });
          }
        });

        await Promise.all(batchPromises);

        // Rate limit between batches
        if (i + BATCH_SIZE < productIds.length) await delay(500);
      }

      const totalCreated = results.reduce((s, r) => s + r.reviews_created, 0);
      const totalErrors = results.filter((r) => r.error).length;

      await logEvent(supa, totalErrors > 0 ? "warning" : "info",
        `Geração concluída: ${totalCreated} reviews criados, ${totalErrors} erros`, {
          total_created: totalCreated,
          total_errors: totalErrors,
          results,
        });

      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ============================================================ */
    /*  APPROVE                                                      */
    /* ============================================================ */
    if (action === "approve") {
      const reviewIds: string[] = body?.review_ids ?? [];
      if (!reviewIds.length) throw new Error("No review_ids");

      const { error } = await supa.from("product_reviews")
        .update({ approved: true, updated_at: new Date().toISOString() })
        .in("id", reviewIds);
      if (error) throw error;

      // Recalculate rating summaries
      const { data: reviews } = await supa.from("product_reviews").select("product_id").in("id", reviewIds);
      const productIds = [...new Set((reviews ?? []).map((r: any) => r.product_id))];
      for (const pid of productIds) {
        await supa.rpc("recalculate_rating_summary", { _product_id: pid });
      }

      await logEvent(supa, "info", `${reviewIds.length} reviews aprovados`, { review_ids: reviewIds.slice(0, 10) });

      return new Response(JSON.stringify({ ok: true, approved: reviewIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ============================================================ */
    /*  REJECT                                                       */
    /* ============================================================ */
    if (action === "reject") {
      const reviewIds: string[] = body?.review_ids ?? [];
      if (!reviewIds.length) throw new Error("No review_ids");
      const { error } = await supa.from("product_reviews").delete().in("id", reviewIds);
      if (error) throw error;

      await logEvent(supa, "info", `${reviewIds.length} reviews removidos`, { review_ids: reviewIds.slice(0, 10) });

      return new Response(JSON.stringify({ ok: true, deleted: reviewIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ============================================================ */
    /*  DAILY AUTO-GENERATE                                          */
    /* ============================================================ */
    if (action === "daily") {
      await logEvent(supa, "info", "Job diário de reviews iniciado");

      // Count total active products
      const { count: totalProducts } = await supa
        .from("store_products")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .eq("status", "published");

      if (!totalProducts || totalProducts === 0) {
        await logEvent(supa, "warning", "Job diário: nenhum produto ativo encontrado");
        return new Response(JSON.stringify({ ok: true, message: "No products" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Select 2% of products that need more reviews (< 20 reviews)
      const dailyTarget = Math.max(5, Math.ceil(totalProducts * 0.02));

      // Get products with fewest reviews
      const { data: candidates } = await supa
        .from("store_products")
        .select("id")
        .eq("active", true)
        .eq("status", "published")
        .limit(dailyTarget * 3); // fetch extra to filter

      if (!candidates?.length) {
        return new Response(JSON.stringify({ ok: true, message: "No candidates" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check which have fewer reviews
      const productScores: { id: string; count: number }[] = [];
      for (const c of candidates) {
        const { count } = await supa
          .from("product_reviews")
          .select("id", { count: "exact", head: true })
          .eq("product_id", c.id);
        productScores.push({ id: c.id, count: count ?? 0 });
      }

      // Prioritize products with < 20 reviews
      productScores.sort((a, b) => a.count - b.count);
      const selected = productScores
        .filter((p) => p.count < 250)
        .slice(0, dailyTarget)
        .map((p) => p.id);

      if (!selected.length) {
        await logEvent(supa, "info", "Job diário: todos os produtos já têm 250+ reviews");
        return new Response(JSON.stringify({ ok: true, message: "All covered" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate 3-5 reviews per product
      const reviewsPerProduct = Math.min(5, Math.max(3, Math.round(Math.random() * 2 + 3)));

      // Re-invoke self with generate action in batches
      const results: any[] = [];
      const CHUNK = 10;
      for (let i = 0; i < selected.length; i += CHUNK) {
        const chunk = selected.slice(i, i + CHUNK);

        // Inline generation (same logic)
        for (const productId of chunk) {
          try {
            const { data: product } = await supa
              .from("store_products")
              .select("id, name, category, description, price, unit")
              .eq("id", productId)
              .single();

            if (!product) continue;

            const prompt = `Você é um gerador de avaliações realistas de clientes para loja de materiais de construção.
Produto: ${product.name} | Categoria: ${product.category || "Geral"} | Preço: R$ ${product.price} | Unidade: ${product.unit || "un"}
Descrição: ${(product.description || "").slice(0, 300)}

Gere ${reviewsPerProduct} avaliações REALISTAS e variadas de clientes brasileiros.
Ratings: maioria 4-5, alguns 3. Nomes e cidades brasileiras diversas.
Retorne APENAS JSON array: [{"author_name":"","author_location":"Cidade - UF","rating":5,"title":"","content":"","pros":null,"cons":null,"verified_purchase":true}]`;

            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }] }),
            });

            if (!aiResp.ok) continue;

            const aiData = await aiResp.json();
            const raw = aiData.choices?.[0]?.message?.content ?? "[]";
            const m = raw.match(/\[[\s\S]*\]/);
            if (!m) continue;

            const reviews = JSON.parse(m[0]);
            const now = Date.now();
            const rows = reviews.map((r: any) => ({
              product_id: productId,
              author_name: String(r.author_name || "Cliente").slice(0, 100),
              author_location: r.author_location ? String(r.author_location).slice(0, 80) : null,
              rating: Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5))),
              title: r.title ? String(r.title).slice(0, 200) : null,
              content: String(r.content || "").slice(0, 2000),
              pros: r.pros && r.pros !== "null" ? String(r.pros).slice(0, 500) : null,
              cons: r.cons && r.cons !== "null" ? String(r.cons).slice(0, 500) : null,
              verified_purchase: true,
              approved: false,
              origin: "ai_generated",
              created_at: new Date(now - Math.floor(Math.random() * 90) * 86400000).toISOString(),
            }));

            await supa.from("product_reviews").insert(rows);
            results.push({ product_id: productId, created: rows.length });
          } catch { /* continue */ }
        }

        if (i + CHUNK < selected.length) await delay(1000);
      }

      const totalCreated = results.reduce((s: number, r: any) => s + (r.created ?? 0), 0);
      await logEvent(supa, "info", `Job diário concluído: ${totalCreated} reviews para ${results.length} produtos`, {
        total_created: totalCreated,
        products_processed: results.length,
      });

      return new Response(JSON.stringify({ ok: true, daily: true, total_created: totalCreated, products: results.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ============================================================ */
    /*  STATS                                                        */
    /* ============================================================ */
    if (action === "stats") {
      const [totalRes, pendingRes, approvedRes, productsRes] = await Promise.all([
        supa.from("product_reviews").select("id", { count: "exact", head: true }),
        supa.from("product_reviews").select("id", { count: "exact", head: true }).eq("approved", false),
        supa.from("product_reviews").select("id", { count: "exact", head: true }).eq("approved", true),
        supa.from("store_products").select("id", { count: "exact", head: true }).eq("active", true),
      ]);

      return new Response(JSON.stringify({
        ok: true,
        total_reviews: totalRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        total_products: productsRes.count ?? 0,
      }), {
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

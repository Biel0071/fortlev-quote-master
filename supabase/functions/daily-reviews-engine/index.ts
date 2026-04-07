import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/* ---------- Rating distribution: 5★=55%, 4★=25%, 3★=12%, 2★=5%, 1★=3% ---------- */
function pickRating(): number {
  const r = Math.random() * 100;
  if (r < 55) return 5;
  if (r < 80) return 4;
  if (r < 92) return 3;
  if (r < 97) return 2;
  return 1;
}

const MAX_TOTAL_PER_PRODUCT = 150;

function pickTodayTimestamp(startHour: number, endHour: number): Date {
  const now = new Date();
  const hour = startHour + Math.random() * (endHour - startHour);
  const minute = Math.floor(Math.random() * 60);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(hour), minute, Math.floor(Math.random() * 60));
}

async function getAvailableImages(supa: any, supabaseUrl: string, productId: string) {
  const [poolRes, prodRes] = await Promise.all([
    supa.from("review_image_pool").select("id, image_url, usage_count").eq("product_id", productId).order("usage_count", { ascending: true }).limit(30),
    supa.from("store_product_images").select("id, path, usage_count").eq("product_id", productId).order("usage_count", { ascending: true }).limit(30),
  ]);

  const images: { id: string; url: string; source: "pool" | "product" }[] = [];
  for (const img of poolRes.data ?? []) {
    images.push({ id: img.id, url: img.image_url, source: "pool" });
  }
  for (const img of prodRes.data ?? []) {
    const p = img.path as string;
    const url = p.startsWith("http") ? p : `${supabaseUrl}/storage/v1/object/public/product-images/${p}`;
    images.push({ id: img.id, url, source: "product" });
  }
  return images;
}

async function incrementUsage(supa: any, id: string, source: "pool" | "product") {
  const table = source === "pool" ? "review_image_pool" : "store_product_images";
  try {
    const { data } = await supa.from(table).select("usage_count").eq("id", id).single();
    await supa.from(table).update({ usage_count: ((data?.usage_count ?? 0) + 1) }).eq("id", id);
  } catch { /* best-effort */ }
}

/* ---------- Deduplication: check if similar content already exists ---------- */
async function isDuplicate(supa: any, productId: string, content: string): Promise<boolean> {
  if (!content || content.length < 20) return false;
  const snippet = content.slice(0, 60);
  const { data } = await supa
    .from("product_reviews")
    .select("id")
    .eq("product_id", productId)
    .ilike("content", `${snippet}%`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/* ---------- Recalc rating summary ---------- */
async function recalcRatingSummary(supa: any, productId: string) {
  try {
    // Use the DB function for atomicity
    await supa.rpc("recalculate_rating_summary", { _product_id: productId });
  } catch {
    // Fallback to manual calc
    try {
      const { data: reviews } = await supa.from("product_reviews").select("rating").eq("product_id", productId).eq("approved", true);
      if (!reviews?.length) {
        await supa.from("product_rating_summary").upsert({
          product_id: productId, average_rating: 0, total_reviews: 0,
          rating_1: 0, rating_2: 0, rating_3: 0, rating_4: 0, rating_5: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "product_id" });
        return;
      }
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      for (const r of reviews) { const rt = Math.max(1, Math.min(5, r.rating)); counts[rt]++; sum += rt; }
      await supa.from("product_rating_summary").upsert({
        product_id: productId,
        average_rating: +(sum / reviews.length).toFixed(2),
        total_reviews: reviews.length,
        rating_1: counts[1], rating_2: counts[2], rating_3: counts[3], rating_4: counts[4], rating_5: counts[5],
        updated_at: new Date().toISOString(),
      }, { onConflict: "product_id" });
    } catch { /* best-effort */ }
  }
}

/* ---------- Main ---------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!SUPABASE_URL || !SERVICE) throw new Error("Missing backend config");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supa = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok for cron */ }
    const action = String(body?.action ?? "run");

    /* GET CONFIG */
    if (action === "get_config") {
      const { data } = await supa.from("reviews_daily_engine").select("*").limit(1).single();
      return new Response(JSON.stringify({ ok: true, config: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* UPDATE CONFIG */
    if (action === "update_config") {
      const updates: any = {};
      if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);
      if (body.max_reviews_per_day !== undefined) updates.max_reviews_per_day = Math.min(100, Math.max(1, Number(body.max_reviews_per_day)));
      if (body.min_reviews_per_day !== undefined) updates.min_reviews_per_day = Math.min(100, Math.max(1, Number(body.min_reviews_per_day)));
      if (body.max_reviews_per_product !== undefined) updates.max_reviews_per_product = Math.min(10, Math.max(1, Number(body.max_reviews_per_product)));
      if (body.start_hour !== undefined) updates.start_hour = Math.min(23, Math.max(0, Number(body.start_hour)));
      if (body.end_hour !== undefined) updates.end_hour = Math.min(23, Math.max(1, Number(body.end_hour)));
      if (body.image_percentage !== undefined) updates.image_percentage = Math.min(100, Math.max(0, Number(body.image_percentage)));
      updates.updated_at = new Date().toISOString();

      const { data: configs } = await supa.from("reviews_daily_engine").select("id").limit(1);
      if (configs?.length) {
        await supa.from("reviews_daily_engine").update(updates).eq("id", configs[0].id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* HISTORY */
    if (action === "history") {
      const { data } = await supa.from("reviews_daily_runs").select("*").order("created_at", { ascending: false }).limit(30);
      return new Response(JSON.stringify({ ok: true, runs: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* SYNC ALL - recalculate all rating summaries */
    if (action === "sync_all") {
      const { data: productIds } = await supa
        .from("product_reviews")
        .select("product_id")
        .eq("approved", true);

      const uniqueIds = [...new Set((productIds ?? []).map((r: any) => r.product_id))];
      for (const pid of uniqueIds) {
        await recalcRatingSummary(supa, pid);
      }

      return new Response(JSON.stringify({ ok: true, synced: uniqueIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* RUN - the main daily engine */
    if (action === "run") {
      // 1. Get config
      const { data: config } = await supa.from("reviews_daily_engine").select("*").limit(1).single();
      if (!config || !config.enabled) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Engine disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Check if already ran today
      const today = new Date().toISOString().slice(0, 10);
      const { data: todayRuns } = await supa.from("reviews_daily_runs").select("id").eq("run_date", today).eq("status", "completed");
      if (todayRuns?.length) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Already ran today" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Calculate today's target
      const minR = config.min_reviews_per_day ?? 5;
      const maxR = config.max_reviews_per_day ?? 40;
      const todayTarget = Math.floor(Math.random() * (maxR - minR + 1)) + minR;
      const maxPerProduct = config.max_reviews_per_product ?? 3;
      const startHour = config.start_hour ?? 8;
      const endHour = config.end_hour ?? 22;
      const imageChance = (config.image_percentage ?? 10) / 100;

      // 4. Get all active products with review counts
      const { data: products } = await supa
        .from("store_products")
        .select("id, name, category, description, price, unit, featured, best_seller, views")
        .eq("active", true)
        .eq("status", "published")
        .limit(1000);

      if (!products?.length) {
        await supa.from("reviews_daily_runs").insert({ run_date: today, target_count: todayTarget, status: "completed", error_message: "No products" });
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No products" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get review counts per product in batch
      const productReviewCounts: Record<string, number> = {};
      for (const p of products) {
        const { count } = await supa.from("product_reviews").select("id", { count: "exact", head: true }).eq("product_id", p.id);
        productReviewCounts[p.id] = count ?? 0;
      }

      // Filter out products at limit
      const eligible = products.filter((p: any) => (productReviewCounts[p.id] ?? 0) < MAX_TOTAL_PER_PRODUCT);
      if (!eligible.length) {
        await supa.from("reviews_daily_runs").insert({ run_date: today, target_count: todayTarget, status: "completed", error_message: "All products at limit" });
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "All at limit" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 5. Score products
      const scored = eligible.map((p: any) => {
        const reviewCount = productReviewCounts[p.id] ?? 0;
        let score = 0;
        if (reviewCount < 5) score += 10;
        else if (reviewCount < 15) score += 7;
        else if (reviewCount < 30) score += 4;
        else score += 1;
        if (p.featured) score += 3;
        if (p.best_seller) score += 3;
        if ((p.views ?? 0) > 50) score += 2;
        score += Math.random() * 5;
        return { ...p, score, reviewCount };
      });

      scored.sort((a: any, b: any) => b.score - a.score);

      // 6. Distribute reviews
      const assignments: { product: any; count: number }[] = [];
      let remaining = todayTarget;

      for (const p of scored) {
        if (remaining <= 0) break;
        const maxForThis = Math.min(maxPerProduct, MAX_TOTAL_PER_PRODUCT - p.reviewCount);
        if (maxForThis <= 0) continue;
        const count = Math.min(remaining, Math.floor(Math.random() * maxForThis) + 1);
        assignments.push({ product: p, count });
        remaining -= count;
      }

      if (!assignments.length) {
        await supa.from("reviews_daily_runs").insert({ run_date: today, target_count: todayTarget, status: "completed", error_message: "No assignments" });
        return new Response(JSON.stringify({ ok: true, reviews_generated: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 7. Generate reviews
      let totalCreated = 0;
      let totalImages = 0;
      let totalDuplicatesSkipped = 0;
      const productsCovered = new Set<string>();

      for (const { product, count } of assignments) {
        const ratings = Array.from({ length: count }, () => pickRating());
        const ratingHint = ratings.map((r, idx) => `Review ${idx + 1}: ${r} estrelas`).join("\n");

        const prompt = `Você é um gerador de avaliações realistas de clientes para uma loja de materiais de construção brasileira.

Produto: ${product.name}
Categoria: ${product.category || "Geral"}
Preço: R$ ${product.price}
Unidade: ${product.unit || "un"}

Gere exatamente ${count} avaliações ÚNICAS e REALISTAS. Cada uma DEVE seguir a nota indicada:
${ratingHint}

Regras:
- Use EXATAMENTE as notas acima para cada review na ordem
- Nomes brasileiros diversos (nunca repita nomes usados antes)
- Cidades variadas do Brasil
- Variar comprimento: 30% curtos (1-2 frases), 50% médios (3-5 frases), 20% detalhados
- Reviews de 1-2★: reclamações realistas (demora, defeito, tamanho errado)
- Reviews de 3★: neutras (ok mas com ressalvas)
- Reviews de 4-5★: positivas e específicas sobre o produto
- Linguagem natural, coloquial brasileira
- NUNCA repetir frases ou estruturas entre reviews

Retorne APENAS um JSON array:
[{"author_name":"Nome","author_location":"Cidade - UF","rating":5,"title":"Título","content":"Texto...","pros":"positivo ou null","cons":"negativo ou null"}]`;

        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }] }),
          });

          if (!aiResp.ok) {
            if (aiResp.status === 429) { await delay(5000); continue; }
            await aiResp.text();
            continue;
          }

          const aiData = await aiResp.json();
          const raw = aiData.choices?.[0]?.message?.content ?? "[]";
          const match = raw.match(/\[[\s\S]*\]/);
          if (!match) continue;

          let reviews: any[];
          try { reviews = JSON.parse(match[0]); } catch { continue; }

          const availableImages = await getAvailableImages(supa, SUPABASE_URL, product.id);
          let imgIdx = 0;

          for (let idx = 0; idx < reviews.length; idx++) {
            const r = reviews[idx];
            const content = String(r.content || "").slice(0, 2000);

            // Deduplication check
            if (await isDuplicate(supa, product.id, content)) {
              totalDuplicatesSkipped++;
              continue;
            }

            const timestamp = pickTodayTimestamp(startHour, endHour);
            const shouldImage = availableImages.length > 0 && Math.random() < imageChance;

            const row = {
              product_id: product.id,
              author_name: String(r.author_name || "Cliente").slice(0, 100),
              author_location: r.author_location ? String(r.author_location).slice(0, 80) : null,
              rating: Math.max(1, Math.min(5, idx < ratings.length ? ratings[idx] : pickRating())),
              title: r.title ? String(r.title).slice(0, 200) : null,
              content,
              pros: r.pros && r.pros !== "null" ? String(r.pros).slice(0, 500) : null,
              cons: r.cons && r.cons !== "null" ? String(r.cons).slice(0, 500) : null,
              verified_purchase: true,
              approved: true,
              origin: "ai_generated",
              created_at: timestamp.toISOString(),
            };

            const { data: inserted, error: insertErr } = await supa.from("product_reviews").insert(row).select("id").single();
            if (insertErr || !inserted) continue;
            totalCreated++;
            productsCovered.add(product.id);

            if (shouldImage) {
              const img = availableImages[imgIdx % availableImages.length];
              imgIdx++;
              await supa.from("review_images").insert({ review_id: inserted.id, image_url: img.url, sort_order: 0 });
              await incrementUsage(supa, img.id, img.source);
              totalImages++;
            }
          }
        } catch (e) {
          console.error(`Error generating for ${product.name}:`, e);
        }

        await delay(500);
      }

      // 8. Recalc ratings for ALL covered products
      for (const pid of productsCovered) {
        await recalcRatingSummary(supa, pid);
      }

      // 9. Log the run
      await supa.from("reviews_daily_runs").insert({
        run_date: today,
        reviews_generated: totalCreated,
        images_attached: totalImages,
        products_covered: productsCovered.size,
        target_count: todayTarget,
        status: "completed",
      });

      await supa.from("system_event_logs").insert({
        level: "info",
        event_type: "daily_review_engine",
        source: "daily-reviews-engine",
        message: `Engine diária: ${totalCreated} reviews (${totalImages} imgs) para ${productsCovered.size} produtos (meta: ${todayTarget}, dupes: ${totalDuplicatesSkipped})`,
        metadata: { reviews_generated: totalCreated, images_attached: totalImages, products_covered: productsCovered.size, target: todayTarget, duplicates_skipped: totalDuplicatesSkipped },
      });

      return new Response(JSON.stringify({
        ok: true,
        reviews_generated: totalCreated,
        images_attached: totalImages,
        products_covered: productsCovered.size,
        target_count: todayTarget,
        duplicates_skipped: totalDuplicatesSkipped,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function pickRating(): number {
  const r = Math.random() * 100;
  if (r < 55) return 5;
  if (r < 80) return 4;
  if (r < 92) return 3;
  if (r < 97) return 2;
  return 1;
}

const MAX_TOTAL_PER_PRODUCT = 150;
const MAX_PRODUCTS_PER_RUN = 5; // Keep runs fast (under 50s)

function pickTodayTimestamp(startHour: number, endHour: number): Date {
  const now = new Date();
  const hour = startHour + Math.random() * (endHour - startHour);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(hour), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
}

async function getAvailableImages(supa: any, supabaseUrl: string, productId: string) {
  const [poolRes, prodRes] = await Promise.all([
    supa.from("review_image_pool").select("id, image_url, usage_count").eq("product_id", productId).order("usage_count", { ascending: true }).limit(20),
    supa.from("store_product_images").select("id, path, usage_count").eq("product_id", productId).order("usage_count", { ascending: true }).limit(20),
  ]);
  const images: { id: string; url: string; source: "pool" | "product" }[] = [];
  for (const img of poolRes.data ?? []) images.push({ id: img.id, url: img.image_url, source: "pool" });
  for (const img of prodRes.data ?? []) {
    const p = img.path as string;
    images.push({ id: img.id, url: p.startsWith("http") ? p : `${supabaseUrl}/storage/v1/object/public/product-images/${p}`, source: "product" });
  }
  return images;
}

async function incrementUsage(supa: any, id: string, source: "pool" | "product") {
  const table = source === "pool" ? "review_image_pool" : "store_product_images";
  try {
    const { data } = await supa.from(table).select("usage_count").eq("id", id).single();
    await supa.from(table).update({ usage_count: ((data?.usage_count ?? 0) + 1) }).eq("id", id);
  } catch { /* ok */ }
}

async function recalcRatingSummary(supa: any, productId: string) {
  try {
    await supa.rpc("recalculate_rating_summary", { _product_id: productId });
  } catch {
    try {
      const { data: reviews } = await supa.from("product_reviews").select("rating").eq("product_id", productId).eq("approved", true);
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      for (const r of (reviews ?? [])) { const rt = Math.max(1, Math.min(5, r.rating)); counts[rt]++; sum += rt; }
      const total = reviews?.length ?? 0;
      await supa.from("product_rating_summary").upsert({
        product_id: productId, average_rating: total > 0 ? +(sum / total).toFixed(2) : 0, total_reviews: total,
        rating_1: counts[1], rating_2: counts[2], rating_3: counts[3], rating_4: counts[4], rating_5: counts[5],
        updated_at: new Date().toISOString(),
      }, { onConflict: "product_id" });
    } catch { /* ok */ }
  }
}

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
      if (configs?.length) await supa.from("reviews_daily_engine").update(updates).eq("id", configs[0].id);

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* HISTORY */
    if (action === "history") {
      const { data } = await supa.from("reviews_daily_runs").select("*").order("created_at", { ascending: false }).limit(30);
      return new Response(JSON.stringify({ ok: true, runs: data ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* SYNC ALL - recalculate all rating summaries */
    if (action === "sync_all") {
      const { data: pids } = await supa.from("product_reviews").select("product_id").eq("approved", true);
      const uniqueIds = [...new Set((pids ?? []).map((r: any) => r.product_id))];
      for (const pid of uniqueIds) await recalcRatingSummary(supa, pid);
      return new Response(JSON.stringify({ ok: true, synced: uniqueIds.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* RUN - the main daily engine (optimized for speed) */
    if (action === "run") {
      const { data: config } = await supa.from("reviews_daily_engine").select("*").limit(1).single();
      if (!config || !config.enabled) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Engine disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const maxPerProduct = config.max_reviews_per_product ?? 3;
      const startHour = config.start_hour ?? 8;
      const endHour = config.end_hour ?? 22;
      const imageChance = (config.image_percentage ?? 10) / 100;

      // Get review counts from summary table for products that already have reviews
      const { data: summaries } = await supa
        .from("product_rating_summary")
        .select("product_id, total_reviews")
        .lt("total_reviews", MAX_TOTAL_PER_PRODUCT);

      const reviewCountMap: Record<string, number> = {};
      for (const s of (summaries ?? [])) reviewCountMap[s.product_id] = s.total_reviews;

      // Get a sample of active products
      const { data: products } = await supa
        .from("store_products")
        .select("id, name, category, description, price, unit, featured, best_seller")
        .eq("active", true)
        .eq("status", "published")
        .limit(200);

      console.log(`[engine] Found ${products?.length ?? 0} products, ${summaries?.length ?? 0} with summaries`);

      if (!products?.length) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No products" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Score and sort: products without reviews first, then few reviews, then popular
      const scored = products.map((p: any) => {
        const rc = reviewCountMap[p.id] ?? 0;
        let score = 0;
        if (rc === 0) score += 15;
        else if (rc < 5) score += 10;
        else if (rc < 15) score += 7;
        else if (rc < 30) score += 4;
        else if (rc >= MAX_TOTAL_PER_PRODUCT) score -= 100;
        else score += 1;
        if (p.featured) score += 3;
        if (p.best_seller) score += 3;
        score += Math.random() * 5;
        return { ...p, score, reviewCount: rc };
      }).filter(p => p.score > 0);

      scored.sort((a, b) => b.score - a.score);

      // Pick top N products to process this run
      const selected = scored.slice(0, MAX_PRODUCTS_PER_RUN);
      console.log(`[engine] Scored: ${scored.length}, Selected: ${selected.length}, Top scores: ${selected.slice(0,3).map(s => `${s.name}(rc=${s.reviewCount},s=${s.score.toFixed(1)})`).join(', ')}`);
      if (!selected.length) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No eligible products" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Generate reviews for selected products
      let totalCreated = 0;
      let totalImages = 0;
      const productsCovered = new Set<string>();

      for (const product of selected) {
        const count = Math.min(maxPerProduct, MAX_TOTAL_PER_PRODUCT - product.reviewCount);
        if (count <= 0) continue;

        const ratings = Array.from({ length: count }, () => pickRating());
        const ratingHint = ratings.map((r, idx) => `Review ${idx + 1}: ${r} estrelas`).join("\n");

        const prompt = `Gere ${count} avaliações ÚNICAS e REALISTAS para um produto de loja de materiais de construção brasileira.

Produto: ${product.name}
Categoria: ${product.category || "Geral"}
Preço: R$ ${product.price}
Unidade: ${product.unit || "un"}

Notas obrigatórias:
${ratingHint}

Regras: nomes brasileiros diversos, cidades variadas, linguagem coloquial, variar comprimento. Reviews 1-2★ com reclamações, 3★ neutras, 4-5★ positivas.

Retorne APENAS JSON array:
[{"author_name":"Nome","author_location":"Cidade-UF","rating":5,"title":"Título","content":"Texto","pros":"positivo ou null","cons":"negativo ou null"}]`;

        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: prompt }] }),
          });

          if (!aiResp.ok) { const errText = await aiResp.text(); console.error(`[engine] AI error ${aiResp.status} for ${product.name}: ${errText.slice(0,200)}`); continue; }

          const aiData = await aiResp.json();
          const raw = aiData.choices?.[0]?.message?.content ?? "[]";
          const match = raw.match(/\[[\s\S]*\]/);
          if (!match) continue;

          let reviews: any[];
          try { reviews = JSON.parse(match[0]); } catch { continue; }

          const availableImages = await getAvailableImages(supa, SUPABASE_URL, product.id);
          let imgIdx = 0;

          // Batch insert all reviews at once
          const rows = reviews.slice(0, count).map((r: any, idx: number) => ({
            product_id: product.id,
            author_name: String(r.author_name || "Cliente").slice(0, 100),
            author_location: r.author_location ? String(r.author_location).slice(0, 80) : null,
            rating: Math.max(1, Math.min(5, idx < ratings.length ? ratings[idx] : pickRating())),
            title: r.title ? String(r.title).slice(0, 200) : null,
            content: String(r.content || "").slice(0, 2000),
            pros: r.pros && r.pros !== "null" ? String(r.pros).slice(0, 500) : null,
            cons: r.cons && r.cons !== "null" ? String(r.cons).slice(0, 500) : null,
            verified_purchase: true,
            approved: true,
            origin: "ai_generated",
            created_at: pickTodayTimestamp(startHour, endHour).toISOString(),
          }));

          const { data: inserted, error: insertErr } = await supa
            .from("product_reviews")
            .insert(rows)
            .select("id");

          if (insertErr || !inserted?.length) continue;
          totalCreated += inserted.length;
          productsCovered.add(product.id);

          // Attach images to some reviews
          if (availableImages.length > 0) {
            for (const rev of inserted) {
              if (Math.random() < imageChance) {
                const img = availableImages[imgIdx % availableImages.length];
                imgIdx++;
                await supa.from("review_images").insert({ review_id: rev.id, image_url: img.url, sort_order: 0 });
                await incrementUsage(supa, img.id, img.source);
                totalImages++;
              }
            }
          }
        } catch (e) {
          console.error(`Error for ${product.name}:`, e);
        }
      }

      // Recalc ratings
      for (const pid of productsCovered) await recalcRatingSummary(supa, pid);

      // Log run
      const today = new Date().toISOString().slice(0, 10);
      await supa.from("reviews_daily_runs").insert({
        run_date: today,
        reviews_generated: totalCreated,
        images_attached: totalImages,
        products_covered: productsCovered.size,
        target_count: selected.length * maxPerProduct,
        status: "completed",
      });

      return new Response(JSON.stringify({
        ok: true,
        reviews_generated: totalCreated,
        images_attached: totalImages,
        products_covered: productsCovered.size,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

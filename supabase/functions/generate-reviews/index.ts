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

/* ---------- Image helpers ---------- */

async function getReviewPoolImages(supa: any, productId: string) {
  const { data: poolImages } = await supa
    .from("review_image_pool")
    .select("id, image_url, usage_count")
    .eq("product_id", productId)
    .order("usage_count", { ascending: true })
    .limit(50);

  return (poolImages ?? []).map((img: any) => ({
    id: img.id,
    url: img.image_url as string,
    usage_count: img.usage_count ?? 0,
    source: "pool" as const,
  }));
}

async function getProductImages(supa: any, supabaseUrl: string, productId: string) {
  const { data: storedImages } = await supa
    .from("store_product_images")
    .select("id, path, usage_count")
    .eq("product_id", productId)
    .order("usage_count", { ascending: true })
    .limit(50);

  if (!storedImages?.length) return [];

  return storedImages.map((img: any) => {
    const p = img.path as string;
    const url = p.startsWith("http") ? p : `${supabaseUrl}/storage/v1/object/public/product-images/${p}`;
    return { id: img.id, url, usage_count: img.usage_count ?? 0, source: "product" as const };
  });
}

async function getAlreadyUsedImageUrls(supa: any, productId: string): Promise<Set<string>> {
  const { data: existingReviews } = await supa
    .from("product_reviews")
    .select("id")
    .eq("product_id", productId)
    .limit(500);
  if (!existingReviews?.length) return new Set();
  const reviewIds = existingReviews.map((r: any) => r.id);
  const { data: usedImgs } = await supa
    .from("review_images")
    .select("image_url")
    .in("review_id", reviewIds);
  return new Set((usedImgs ?? []).map((i: any) => i.image_url as string));
}

async function incrementPoolUsage(supa: any, imageId: string, source: "pool" | "product") {
  try {
    if (source === "pool") {
      const { data } = await supa.from("review_image_pool").select("usage_count").eq("id", imageId).single();
      await supa.from("review_image_pool").update({ usage_count: ((data?.usage_count ?? 0) as number) + 1 }).eq("id", imageId);
    } else {
      const { data } = await supa.from("store_product_images").select("usage_count").eq("id", imageId).single();
      await supa.from("store_product_images").update({ usage_count: ((data?.usage_count ?? 0) as number) + 1 }).eq("id", imageId);
    }
  } catch { /* best-effort */ }
}

/* ---------- Popularity tier ---------- */

type PopularityTier = "popular" | "medium" | "common";

function getPopularityTier(product: {
  price?: number;
  featured?: boolean;
  best_seller?: boolean;
  in_home_section?: boolean;
  existing_reviews: number;
}): PopularityTier {
  const score =
    (product.featured ? 3 : 0) +
    (product.best_seller ? 3 : 0) +
    (product.in_home_section ? 2 : 0) +
    ((product.price ?? 0) > 200 ? 1 : 0) +
    (product.existing_reviews > 5 ? 1 : 0);

  if (score >= 4) return "popular";
  if (score >= 2) return "medium";
  return "common";
}

function getTargetReviewCount(tier: PopularityTier): number {
  switch (tier) {
    case "popular": return Math.floor(Math.random() * 71) + 80; // 80-150
    case "medium": return Math.floor(Math.random() * 51) + 30;  // 30-80
    case "common": return Math.floor(Math.random() * 21) + 10;  // 10-30
  }
}

/* ---------- Rating distribution ---------- */
// 5★=55%, 4★=25%, 3★=12%, 2★=5%, 1★=3%
function pickRating(): number {
  const r = Math.random() * 100;
  if (r < 55) return 5;
  if (r < 80) return 4;
  if (r < 92) return 3;
  if (r < 97) return 2;
  return 1;
}

/* ---------- Date distribution ---------- */
// 2023=20%, 2024=60%, 2025=20%
function pickReviewDate(): Date {
  const r = Math.random() * 100;
  let year: number;
  if (r < 20) year = 2023;
  else if (r < 80) year = 2024;
  else year = 2025;

  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  const hour = Math.floor(Math.random() * 18) + 6;
  const minute = Math.floor(Math.random() * 60);
  return new Date(year, month, day, hour, minute);
}

/* ---------- Core review generation ---------- */

type GenerationMode = "text" | "image" | "text_image";

const MAX_REVIEWS_GLOBAL = 150;
const MAX_AI_BATCH = 15; // max reviews per AI call to avoid token limits

async function generateReviewsForProduct(
  supa: any,
  supabaseUrl: string,
  lovableApiKey: string,
  productId: string,
  count: number,
  mode: GenerationMode,
  useDateDistribution = false,
): Promise<{ reviews_created: number; images_attached: number; error?: string }> {
  const { data: product } = await supa
    .from("store_products")
    .select("id, name, category, description, price, unit")
    .eq("id", productId)
    .single();

  if (!product) return { reviews_created: 0, images_attached: 0, error: "Product not found" };

  // Check existing review count
  const { count: existingCount } = await supa
    .from("product_reviews")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if ((existingCount ?? 0) >= MAX_REVIEWS_GLOBAL) {
    return { reviews_created: 0, images_attached: 0, error: "Max 150 reviews reached" };
  }

  const remainingSlots = MAX_REVIEWS_GLOBAL - (existingCount ?? 0);
  const actualCount = Math.min(count, remainingSlots);
  if (actualCount <= 0) return { reviews_created: 0, images_attached: 0, error: "No slots" };

  // Get available images
  let allAvailableImages: { id: string; url: string; usage_count: number; source: "pool" | "product" }[] = [];
  if (mode === "image" || mode === "text_image") {
    const poolImages = await getReviewPoolImages(supa, productId);
    const catalogImages = await getProductImages(supa, supabaseUrl, productId);
    allAvailableImages = [...poolImages, ...catalogImages];
    const alreadyUsed = await getAlreadyUsedImageUrls(supa, productId);
    const unused = allAvailableImages.filter((img) => !alreadyUsed.has(img.url));
    allAvailableImages = unused.length > 0 ? unused : allAvailableImages;
  }

  // Generate in sub-batches if count > MAX_AI_BATCH
  let totalCreated = 0;
  let totalImages = 0;
  let remaining = actualCount;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, MAX_AI_BATCH);

    // Pre-pick ratings for this batch to enforce distribution
    const ratings = Array.from({ length: batchSize }, () => pickRating());
    const ratingHint = ratings.map((r, i) => `Review ${i + 1}: ${r} estrelas`).join("\n");

    const prompt = `Você é um gerador de avaliações realistas de clientes para uma loja de materiais de construção brasileira.

Produto: ${product.name}
Categoria: ${product.category || "Geral"}
Preço: R$ ${product.price}
Unidade: ${product.unit || "un"}
Descrição: ${(product.description || "").slice(0, 400)}

Gere exatamente ${batchSize} avaliações REALISTAS. Cada uma DEVE seguir a nota indicada abaixo:
${ratingHint}

Regras obrigatórias:
- Use EXATAMENTE as notas acima para cada review na ordem
- Nomes brasileiros diversos: João, Marcos, Carlos, Rafael, Juliana, Fernanda, Camila, André, Paulo, Ana, Maria, Pedro, Lucas, Beatriz, Renato, Patrícia, etc
- Cidades variadas: São Paulo-SP, Rio de Janeiro-RJ, Belo Horizonte-MG, Salvador-BA, Curitiba-PR, Recife-PE, Fortaleza-CE, Goiânia-GO, Porto Alegre-RS, Manaus-AM, etc
- Perspectivas: pedreiro, mestre de obras, dono de obra, empreiteiro, engenheiro, arquiteto, pessoa DIY
- Variar comprimento: 30% curtos (1-2 frases), 50% médios (3-5 frases), 20% detalhados (6+ frases)
- Reviews de 1-2 estrelas devem ter reclamações realistas (demora, defeito, tamanho errado)
- Reviews de 3 estrelas devem ser neutras (ok mas com ressalvas)
- Reviews de 4-5 estrelas devem ser positivas e específicas
- Incluir prós e contras em ~40% (o resto null)
- Linguagem natural, coloquial brasileira

Retorne APENAS um JSON array sem markdown:
[{"author_name":"Nome Sobrenome","author_location":"Cidade - UF","rating":5,"title":"Título curto","content":"Texto...","pros":"Pontos positivos ou null","cons":"Pontos negativos ou null","verified_purchase":true}]`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        await delay(5000);
        continue; // retry
      }
      const errText = await aiResp.text();
      return { reviews_created: totalCreated, images_attached: totalImages, error: `AI error ${aiResp.status}: ${errText.slice(0, 200)}` };
    }

    const aiData = await aiResp.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "[]";
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      remaining -= batchSize;
      continue;
    }

    let reviews: any[];
    try {
      reviews = JSON.parse(jsonMatch[0]);
    } catch {
      remaining -= batchSize;
      continue;
    }

    const IMAGE_CHANCE = mode === "image" ? 1.0 : mode === "text_image" ? 0.1 : 0;
    let imageRoundRobinIdx = 0;
    const usedUrlsThisBatch = new Set<string>();

    for (let idx = 0; idx < reviews.length; idx++) {
      const r = reviews[idx];
      const forcedRating = idx < ratings.length ? ratings[idx] : pickRating();
      const contentStr = String(r.content || "").slice(0, 2000);

      // Deduplication check
      if (contentStr.length >= 20) {
        const snippet = contentStr.slice(0, 60);
        const { data: dupeCheck } = await supa
          .from("product_reviews")
          .select("id")
          .eq("product_id", productId)
          .ilike("content", `${snippet}%`)
          .limit(1);
        if (dupeCheck?.length) continue;
      }

      const created = useDateDistribution ? pickReviewDate() : (() => {
        const daysAgo = Math.floor(Math.random() * 90);
        return new Date(Date.now() - daysAgo * 86400000 - Math.floor(Math.random() * 24) * 3600000);
      })();

      const shouldHaveImage = allAvailableImages.length > 0 && Math.random() < IMAGE_CHANCE;

      const row = {
        product_id: productId,
        author_name: String(r.author_name || "Cliente").slice(0, 100),
        author_location: r.author_location ? String(r.author_location).slice(0, 80) : null,
        rating: Math.max(1, Math.min(5, forcedRating)),
        title: r.title ? String(r.title).slice(0, 200) : null,
        content: contentStr,
        pros: r.pros && r.pros !== "null" ? String(r.pros).slice(0, 500) : null,
        cons: r.cons && r.cons !== "null" ? String(r.cons).slice(0, 500) : null,
        verified_purchase: r.verified_purchase ?? true,
        approved: true,
        origin: "ai_generated",
        created_at: created.toISOString(),
      };

      const { data: inserted, error: insertErr } = await supa
        .from("product_reviews")
        .insert(row)
        .select("id")
        .single();

      if (insertErr || !inserted) continue;
      totalCreated++;

      if (shouldHaveImage && allAvailableImages.length > 0) {
        let img = allAvailableImages[imageRoundRobinIdx % allAvailableImages.length];
        if (usedUrlsThisBatch.has(img.url) && allAvailableImages.length > 1) {
          for (let attempt = 0; attempt < allAvailableImages.length; attempt++) {
            const candidate = allAvailableImages[(imageRoundRobinIdx + attempt) % allAvailableImages.length];
            if (!usedUrlsThisBatch.has(candidate.url)) {
              img = candidate;
              imageRoundRobinIdx = imageRoundRobinIdx + attempt;
              break;
            }
          }
          if (usedUrlsThisBatch.has(img.url)) {
            usedUrlsThisBatch.clear();
            img = allAvailableImages[imageRoundRobinIdx % allAvailableImages.length];
          }
        }

        usedUrlsThisBatch.add(img.url);
        imageRoundRobinIdx++;

        await supa.from("review_images").insert({
          review_id: inserted.id,
          image_url: img.url,
          sort_order: 0,
        });
        await incrementPoolUsage(supa, img.id, img.source);
        totalImages++;
      }
    }

    remaining -= batchSize;
    if (remaining > 0) await delay(1000);
  }

  return { reviews_created: totalCreated, images_attached: totalImages };
}

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
      const count = Math.min(Math.max(1, Number(body?.count ?? 3)), 15);
      const mode: GenerationMode = (["text", "image", "text_image"].includes(body?.mode) ? body.mode : "text") as GenerationMode;

      if (!productIds.length) throw new Error("No product_ids provided");

      await logEvent(supa, "info", `Geração iniciada: ${productIds.length} produtos × ${count} reviews (modo: ${mode})`, {
        product_count: productIds.length,
        reviews_per_product: count,
        mode,
      });

      const results: Array<{ product_id: string; reviews_created: number; images_attached: number; error?: string }> = [];
      const BATCH_SIZE = 5;

      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (productId) => {
          const result = await generateReviewsForProduct(supa, SUPABASE_URL, LOVABLE_API_KEY, productId, count, mode);
          results.push({ product_id: productId, ...result });
        });
        await Promise.all(batchPromises);
        if (i + BATCH_SIZE < productIds.length) await delay(500);
      }

      const totalCreated = results.reduce((s, r) => s + r.reviews_created, 0);
      const totalImages = results.reduce((s, r) => s + r.images_attached, 0);
      const totalErrors = results.filter((r) => r.error).length;

      for (const r of results) {
        if (r.reviews_created > 0) await recalcRatingSummary(supa, r.product_id);
      }

      await logEvent(supa, totalErrors > 0 ? "warning" : "info",
        `Geração concluída: ${totalCreated} reviews, ${totalImages} imagens, ${totalErrors} erros (modo: ${mode})`, {
          total_created: totalCreated, total_images: totalImages, total_errors: totalErrors, mode, results,
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

      const { data: reviews } = await supa.from("product_reviews").select("product_id").in("id", reviewIds);
      const productIds = [...new Set((reviews ?? []).map((r: any) => r.product_id))];
      for (const pid of productIds) await recalcRatingSummary(supa, pid);

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

      await supa.from("review_images").delete().in("review_id", reviewIds);
      const { error } = await supa.from("product_reviews").delete().in("id", reviewIds);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, deleted: reviewIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ============================================================ */
    /*  CATALOG - Smart distribution pipeline                        */
    /* ============================================================ */
    if (action === "catalog") {
      const limit = body?.limit ?? 0; // 0 = all
      const batchIndex = body?.batch_index ?? 0;
      const PRODUCTS_PER_BATCH = 10;

      await logEvent(supa, "info", `Pipeline catálogo batch ${batchIndex} (limit: ${limit || "all"})`, { limit, batchIndex });

      // Fetch products with popularity signals
      const allCandidates: {
        id: string; featured: boolean; best_seller: boolean;
        in_home_section: boolean; price: number; existing_reviews: number;
      }[] = [];

      const PAGE_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      // Get home section product IDs for popularity scoring
      const { data: homeSections } = await supa
        .from("home_sections")
        .select("category_id")
        .eq("active", true);
      const homeCatIds = new Set((homeSections ?? []).map((s: any) => s.category_id));

      while (hasMore) {
        const { data: batch } = await supa
          .from("store_products")
          .select("id, featured, best_seller, price, category_id")
          .eq("active", true)
          .eq("status", "published")
          .range(offset, offset + PAGE_SIZE - 1);

        if (!batch?.length) { hasMore = false; break; }

        for (const p of batch) {
          const { count } = await supa
            .from("product_reviews")
            .select("id", { count: "exact", head: true })
            .eq("product_id", p.id);
          allCandidates.push({
            id: p.id,
            featured: p.featured ?? false,
            best_seller: p.best_seller ?? false,
            in_home_section: homeCatIds.has(p.category_id),
            price: p.price ?? 0,
            existing_reviews: count ?? 0,
          });
        }

        offset += PAGE_SIZE;
        if (batch.length < PAGE_SIZE) hasMore = false;
        await delay(200);
      }

      if (!allCandidates.length) {
        return new Response(JSON.stringify({ ok: true, message: "No products", total_created: 0, done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign tiers and target counts
      const withTargets = allCandidates.map((p) => {
        const tier = getPopularityTier(p);
        const target = getTargetReviewCount(tier);
        const needed = Math.max(0, Math.min(target, MAX_REVIEWS_GLOBAL) - p.existing_reviews);
        return { ...p, tier, target, needed };
      });

      // Filter eligible (those needing reviews)
      const eligible = withTargets.filter((p) => p.needed > 0);

      // Shuffle for variety
      for (let i = eligible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
      }

      // Sort: most needed first
      eligible.sort((a, b) => b.needed - a.needed);

      // Apply limit
      const allSelected = limit > 0 ? eligible.slice(0, limit) : eligible;

      // Pick the batch slice
      const batchStart = batchIndex * PRODUCTS_PER_BATCH;
      const batchProducts = allSelected.slice(batchStart, batchStart + PRODUCTS_PER_BATCH);
      const hasMoreBatches = batchStart + PRODUCTS_PER_BATCH < allSelected.length;

      if (!batchProducts.length) {
        return new Response(JSON.stringify({
          ok: true, done: true, total_created: 0,
          total_eligible: eligible.length, total_products: allCandidates.length,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate reviews for this batch
      const results: any[] = [];
      let totalCreated = 0;
      let totalImages = 0;

      for (const p of batchProducts) {
        try {
          const result = await generateReviewsForProduct(
            supa, SUPABASE_URL, LOVABLE_API_KEY,
            p.id, p.needed, "text_image", true
          );
          results.push({ product_id: p.id, tier: p.tier, target: p.target, needed: p.needed, ...result });
          totalCreated += result.reviews_created;
          totalImages += result.images_attached;
        } catch (e) {
          results.push({ product_id: p.id, reviews_created: 0, images_attached: 0, error: String(e) });
        }
        await delay(300);
      }

      // Recalc ratings
      for (const r of results) {
        if (r.reviews_created > 0) await recalcRatingSummary(supa, r.product_id);
      }

      await logEvent(supa, "info", `Pipeline batch ${batchIndex}: ${totalCreated} reviews para ${batchProducts.length} produtos`, {
        total_created: totalCreated, total_images: totalImages, batch_index: batchIndex,
      });

      return new Response(JSON.stringify({
        ok: true,
        done: !hasMoreBatches,
        batch_index: batchIndex,
        next_batch_index: hasMoreBatches ? batchIndex + 1 : null,
        total_created: totalCreated,
        total_images: totalImages,
        products_in_batch: batchProducts.length,
        total_eligible: allSelected.length,
        total_products: allCandidates.length,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ============================================================ */
    /*  STATS                                                        */
    /* ============================================================ */
    if (action === "stats") {
      const [totalRes, pendingRes, approvedRes, productsRes, withImagesRes] = await Promise.all([
        supa.from("product_reviews").select("id", { count: "exact", head: true }),
        supa.from("product_reviews").select("id", { count: "exact", head: true }).eq("approved", false),
        supa.from("product_reviews").select("id", { count: "exact", head: true }).eq("approved", true),
        supa.from("store_products").select("id", { count: "exact", head: true }).eq("active", true),
        supa.from("review_images").select("id", { count: "exact", head: true }),
      ]);

      return new Response(JSON.stringify({
        ok: true,
        total_reviews: totalRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        total_products: productsRes.count ?? 0,
        reviews_with_images: withImagesRes.count ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ---------- Rating recalculation ---------- */

async function recalcRatingSummary(supa: any, productId: string) {
  try {
    await supa.rpc("recalculate_rating_summary", { _product_id: productId });
  } catch {
    // Fallback to manual calc
    try {
      const { data: reviews } = await supa
        .from("product_reviews")
        .select("rating")
        .eq("product_id", productId)
        .eq("approved", true);

      if (!reviews?.length) {
        await supa.from("product_rating_summary").upsert({
          product_id: productId,
          average_rating: 0, total_reviews: 0,
          rating_1: 0, rating_2: 0, rating_3: 0, rating_4: 0, rating_5: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "product_id" });
        return;
      }

      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
      let sum = 0;
      for (const r of reviews) {
        const rating = Math.max(1, Math.min(5, r.rating));
        counts[rating]++;
        sum += rating;
      }

      await supa.from("product_rating_summary").upsert({
        product_id: productId,
        average_rating: +(sum / reviews.length).toFixed(2),
        total_reviews: reviews.length,
        rating_1: counts[1], rating_2: counts[2], rating_3: counts[3],
        rating_4: counts[4], rating_5: counts[5],
        updated_at: new Date().toISOString(),
      }, { onConflict: "product_id" });
    } catch { /* best-effort */ }
  }
}

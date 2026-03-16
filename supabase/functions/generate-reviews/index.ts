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

async function getProductImages(supa: any, supabaseUrl: string, productId: string): Promise<{ id: string; url: string; usage_count: number }[]> {
  const { data: storedImages } = await supa
    .from("store_product_images")
    .select("id, path, usage_count")
    .eq("product_id", productId)
    .order("usage_count", { ascending: true })
    .limit(10);

  if (!storedImages?.length) return [];

  return storedImages.map((img: any) => {
    const p = img.path as string;
    const url = p.startsWith("http") ? p : `${supabaseUrl}/storage/v1/object/public/product-images/${p}`;
    return { id: img.id, url, usage_count: img.usage_count ?? 0 };
  });
}

async function incrementImageUsage(supa: any, imageId: string) {
  try {
    // Read current count and update
    const { data } = await supa.from("store_product_images").select("usage_count").eq("id", imageId).single();
    const current = (data?.usage_count ?? 0) as number;
    await supa.from("store_product_images").update({ usage_count: current + 1 }).eq("id", imageId);
  } catch { /* best-effort */ }
}

/* ---------- Core review generation ---------- */

type GenerationMode = "text" | "image" | "text_image";

async function generateReviewsForProduct(
  supa: any,
  supabaseUrl: string,
  lovableApiKey: string,
  productId: string,
  count: number,
  mode: GenerationMode,
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

  if ((existingCount ?? 0) >= 250) {
    return { reviews_created: 0, images_attached: 0, error: "Max 250 reviews reached" };
  }

  const remainingSlots = 250 - (existingCount ?? 0);
  const actualCount = Math.min(count, remainingSlots);

  // Get available product images for reuse (only if mode allows images)
  let productImages: { id: string; url: string; usage_count: number }[] = [];
  if (mode === "image") {
    productImages = await getProductImages(supa, supabaseUrl, productId);
  }

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
    const errText = await aiResp.text();
    return { reviews_created: 0, images_attached: 0, error: `AI error ${aiResp.status}: ${errText.slice(0, 200)}` };
  }

  const aiData = await aiResp.json();
  const rawContent = aiData.choices?.[0]?.message?.content ?? "[]";
  const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return { reviews_created: 0, images_attached: 0, error: "Failed to parse AI response" };
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

  const IMAGE_CHANCE = 0.3; // 30% of reviews get images when mode=image
  let imagesAttached = 0;
  const now = Date.now();
  const insertedReviewIds: string[] = [];

  for (const r of reviews) {
    const daysAgo = Math.floor(Math.random() * 90);
    const hoursAgo = Math.floor(Math.random() * 24);
    const created = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000);

    // Determine if this review gets an image
    const shouldHaveImage = mode === "image" && productImages.length > 0 && Math.random() < IMAGE_CHANCE;

    const row = {
      product_id: productId,
      author_name: String(r.author_name || "Cliente").slice(0, 100),
      author_location: r.author_location ? String(r.author_location).slice(0, 80) : null,
      rating: Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5))),
      title: r.title ? String(r.title).slice(0, 200) : null,
      content: String(r.content || "").slice(0, 2000),
      pros: r.pros && r.pros !== "null" ? String(r.pros).slice(0, 500) : null,
      cons: r.cons && r.cons !== "null" ? String(r.cons).slice(0, 500) : null,
      verified_purchase: r.verified_purchase ?? true,
      // Reviews with images → pending approval; text-only → auto-approved
      approved: !shouldHaveImage,
      origin: "ai_generated",
      created_at: created.toISOString(),
    };

    const { data: inserted, error: insertErr } = await supa
      .from("product_reviews")
      .insert(row)
      .select("id")
      .single();

    if (insertErr || !inserted) continue;
    insertedReviewIds.push(inserted.id);

    // Attach image if applicable
    if (shouldHaveImage) {
      // Pick image with lowest usage_count
      const img = productImages[0]; // already sorted by usage_count ASC
      await supa.from("review_images").insert({
        review_id: inserted.id,
        image_url: img.url,
        sort_order: 0,
      });
      await incrementImageUsage(supa, img.id);
      // Re-sort to distribute evenly
      productImages.sort((a, b) => a.usage_count - b.usage_count);
      img.usage_count++;
      imagesAttached++;
    }
  }

  return { reviews_created: insertedReviewIds.length, images_attached: imagesAttached };
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
      const count = Math.min(Math.max(1, Number(body?.count ?? 3)), 8);
      const mode: GenerationMode = (["text", "image", "ai"].includes(body?.mode) ? body.mode : "text") as GenerationMode;

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

      await logEvent(supa, totalErrors > 0 ? "warning" : "info",
        `Geração concluída: ${totalCreated} reviews, ${totalImages} imagens, ${totalErrors} erros (modo: ${mode})`, {
          total_created: totalCreated,
          total_images: totalImages,
          total_errors: totalErrors,
          mode,
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
        await recalcRatingSummary(supa, pid);
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

      // Delete associated images first
      await supa.from("review_images").delete().in("review_id", reviewIds);
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

      const dailyTarget = Math.max(5, Math.ceil(totalProducts * 0.02));

      const { data: candidates } = await supa
        .from("store_products")
        .select("id")
        .eq("active", true)
        .eq("status", "published")
        .limit(dailyTarget * 3);

      if (!candidates?.length) {
        return new Response(JSON.stringify({ ok: true, message: "No candidates" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productScores: { id: string; count: number }[] = [];
      for (const c of candidates) {
        const { count } = await supa
          .from("product_reviews")
          .select("id", { count: "exact", head: true })
          .eq("product_id", c.id);
        productScores.push({ id: c.id, count: count ?? 0 });
      }

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

      const reviewsPerProduct = Math.min(5, Math.max(3, Math.round(Math.random() * 2 + 3)));
      const results: any[] = [];
      const CHUNK = 10;

      for (let i = 0; i < selected.length; i += CHUNK) {
        const chunk = selected.slice(i, i + CHUNK);
        for (const productId of chunk) {
          try {
            // Daily job uses "image" mode to attach real photos when available
            const result = await generateReviewsForProduct(supa, SUPABASE_URL, LOVABLE_API_KEY, productId, reviewsPerProduct, "image");
            results.push({ product_id: productId, ...result });
          } catch { /* continue */ }
        }
        if (i + CHUNK < selected.length) await delay(1000);
      }

      const totalCreated = results.reduce((s: number, r: any) => s + (r.reviews_created ?? 0), 0);
      const totalImages = results.reduce((s: number, r: any) => s + (r.images_attached ?? 0), 0);
      await logEvent(supa, "info", `Job diário concluído: ${totalCreated} reviews, ${totalImages} imagens`, {
        total_created: totalCreated,
        total_images: totalImages,
        products_processed: results.length,
      });

      return new Response(JSON.stringify({ ok: true, daily: true, total_created: totalCreated, total_images: totalImages, products: results.length }), {
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
    const { data: reviews } = await supa
      .from("product_reviews")
      .select("rating")
      .eq("product_id", productId)
      .eq("approved", true);

    if (!reviews?.length) {
      await supa.from("product_rating_summary").upsert({
        product_id: productId,
        average_rating: 0,
        total_reviews: 0,
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

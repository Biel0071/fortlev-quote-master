import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Helpers ── */
function safeText(input: unknown, max = 300) {
  return String(input ?? "").trim().slice(0, max);
}

function parseNum(raw?: string | number) {
  if (raw === undefined || raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
}

function decodeEscaped(value: string) {
  return value.replace(/\\u002f/g, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/\\"/g, '"').replace(/\\n/g, " ");
}

/* ── URL / Title filters ── */
const BLOCKED_HOSTS = ["r.bing.com", "bing.com", "duckduckgo.com", "gstatic.com", "pinterest.com", "instagram.com", "facebook.com", "twitter.com", "tiktok.com"];
const URL_BLACKLIST = ["logo", "icon", "sprite", "banner", "svg", "social", "profile", "avatar", "favicon", "selo", "badge", "watermark", "marca-dagua", "placeholder"];

function passesUrlFilter(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (url.startsWith("data:image")) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (BLOCKED_HOSTS.some(b => host.includes(b))) return false;
  } catch { return false; }
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg") || lower.endsWith(".gif")) return false;
  if (URL_BLACKLIST.some(w => lower.includes(w))) return false;
  return true;
}

function filterRealImages(images: { imageUrl: string; width?: number; height?: number }[]) {
  return images.filter(img => {
    if (!passesUrlFilter(img.imageUrl)) return false;
    if (img.width && img.width < 400) return false;
    if (img.height && img.height < 400) return false;
    return true;
  });
}

/* ── Search via DuckDuckGo ── */
async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "GET", signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!response.ok) return "";
    return await response.text();
  } catch { return ""; } finally { clearTimeout(timeout); }
}

type ImageResult = {
  imageUrl: string;
  thumbnail: string;
  title: string;
  width?: number;
  height?: number;
};

async function searchDuckDuckGoImages(query: string): Promise<ImageResult[]> {
  const html = await fetchHtml(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`);
  if (!html) return [];

  const vqd = html.match(/vqd=['"]([^'"]+)['"]/i)?.[1] ?? html.match(/"vqd":"([^"]+)"/i)?.[1] ?? html.match(/vqd=([^&"']+)/i)?.[1] ?? "";
  if (!vqd) return [];

  const endpoint = new URL("https://duckduckgo.com/i.js");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("l", "br-pt");
  endpoint.searchParams.set("o", "json");
  endpoint.searchParams.set("vqd", vqd);
  endpoint.searchParams.set("f", ",,,");
  endpoint.searchParams.set("p", "1");

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Referer: "https://duckduckgo.com/",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json,text/javascript,*/*;q=0.1",
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (Array.isArray(data?.results) ? data.results : []).map((item: any, idx: number) => ({
      imageUrl: safeText(item?.image, 1200),
      thumbnail: safeText(item?.thumbnail, 1200) || safeText(item?.image, 1200),
      title: safeText(item?.title, 160) || `Imagem ${idx + 1}`,
      width: parseNum(item?.width),
      height: parseNum(item?.height),
    }));
  } catch { return []; }
}

/* ── Core: search review images for a product ── */
async function searchReviewImages(productName: string): Promise<ImageResult[]> {
  const queries = [
    `${productName} instalado`,
    `${productName} obra`,
    `${productName} aplicação`,
    `${productName} piso colocado`,
    `${productName} obra construção`,
    `${productName} instalação`,
  ];

  const results = await Promise.allSettled(
    queries.map(q => searchDuckDuckGoImages(q))
  );

  let images: ImageResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") images = images.concat(r.value);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  images = images.filter(img => {
    if (seen.has(img.imageUrl)) return false;
    seen.add(img.imageUrl);
    return true;
  });

  // Filter for real images
  return filterRealImages(images);
}

/* ── Main handler ── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE) throw new Error("Missing backend config");

    const supa = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
    const body = await req.json();
    const action = String(body?.action ?? "search");

    /* ── SEARCH: single product ── */
    if (action === "search") {
      const productId = String(body?.product_id ?? "");
      if (!productId) throw new Error("product_id required");

      const { data: product } = await supa
        .from("store_products")
        .select("id, name")
        .eq("id", productId)
        .single();
      if (!product) throw new Error("product_not_found");

      const images = await searchReviewImages(product.name);

      // Save to review_image_pool
      let saved = 0;
      for (const img of images) {
        const { error } = await supa
          .from("review_image_pool")
          .upsert(
            {
              product_id: productId,
              image_url: img.imageUrl,
              source: "scraper_review",
              usage_count: 0,
            },
            { onConflict: "product_id,image_url" }
          );
        if (!error) saved++;
      }

      return new Response(JSON.stringify({
        ok: true,
        product_id: productId,
        product_name: product.name,
        found: images.length,
        saved,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── BATCH: search for multiple products without pool images ── */
    if (action === "batch") {
      const limit = Math.min(Math.max(1, Number(body?.limit ?? 20)), 100);

      // Find products that have no images in the pool
      const { data: allProducts } = await supa
        .from("store_products")
        .select("id, name")
        .eq("active", true)
        .eq("status", "published")
        .limit(500);

      if (!allProducts?.length) {
        return new Response(JSON.stringify({ ok: true, processed: 0, message: "No products" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check which already have pool images
      const { data: poolCounts } = await supa
        .from("review_image_pool")
        .select("product_id");

      const productIdsWithPool = new Set((poolCounts ?? []).map((r: any) => r.product_id));
      const productsWithoutPool = allProducts.filter((p: any) => !productIdsWithPool.has(p.id));
      const toProcess = productsWithoutPool.slice(0, limit);

      let totalFound = 0;
      let totalSaved = 0;
      const results: any[] = [];

      for (const product of toProcess) {
        try {
          const images = await searchReviewImages(product.name);
          let saved = 0;
          for (const img of images) {
            const { error } = await supa
              .from("review_image_pool")
              .upsert(
                {
                  product_id: product.id,
                  image_url: img.imageUrl,
                  source: "scraper_review",
                  usage_count: 0,
                },
                { onConflict: "product_id,image_url" }
              );
            if (!error) saved++;
          }
          totalFound += images.length;
          totalSaved += saved;
          results.push({ product_id: product.id, name: product.name, found: images.length, saved });
        } catch (e) {
          results.push({ product_id: product.id, name: product.name, error: String(e) });
        }
        // Small delay between products
        await new Promise(r => setTimeout(r, 800));
      }

      // Log event
      await supa.from("system_event_logs").insert({
        level: "info",
        event_type: "review_image_search",
        source: "review-image-pool",
        message: `Busca de imagens reais: ${toProcess.length} produtos, ${totalFound} encontradas, ${totalSaved} salvas`,
        metadata: { processed: toProcess.length, found: totalFound, saved: totalSaved },
      }).catch(() => {});

      return new Response(JSON.stringify({
        ok: true,
        processed: toProcess.length,
        total_found: totalFound,
        total_saved: totalSaved,
        remaining: productsWithoutPool.length - toProcess.length,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── STATS ── */
    if (action === "stats") {
      const { count: totalPool } = await supa
        .from("review_image_pool")
        .select("id", { count: "exact", head: true });

      const { data: productPoolCounts } = await supa
        .from("review_image_pool")
        .select("product_id");

      const uniqueProducts = new Set((productPoolCounts ?? []).map((r: any) => r.product_id)).size;

      return new Response(JSON.stringify({
        ok: true,
        total_images: totalPool ?? 0,
        products_with_pool: uniqueProducts,
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

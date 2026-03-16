import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Category detection (mirror of client-side productIntelligence.ts) ──
const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["caixa d'agua", "caixa dagua", "caixa d\u2019agua"], category: "caixa dagua" },
  { keywords: ["caixa sifonada"], category: "caixa sifonada" },
  { keywords: ["caixa eletrica"], category: "caixa eletrica" },
  { keywords: ["cabo eletrico", "cabo flexivel"], category: "cabo eletrico" },
  { keywords: ["vaso sanitario"], category: "vaso sanitario" },
  { keywords: ["porcelanato"], category: "porcelanato" },
  { keywords: ["revestimento"], category: "revestimento" },
  { keywords: ["impermeabilizante"], category: "impermeabilizante" },
  { keywords: ["argamassa"], category: "argamassa" },
  { keywords: ["vergalhao", "vergalhão"], category: "vergalhao" },
  { keywords: ["cimento"], category: "cimento" },
  { keywords: ["areia"], category: "areia" },
  { keywords: ["brita"], category: "brita" },
  { keywords: ["bloco"], category: "bloco" },
  { keywords: ["tijolo"], category: "tijolo" },
  { keywords: ["telha"], category: "telha" },
  { keywords: ["piso"], category: "piso" },
  { keywords: ["ferro"], category: "ferro" },
  { keywords: ["fio"], category: "fio" },
  { keywords: ["tubo"], category: "tubo" },
  { keywords: ["cano"], category: "cano" },
  { keywords: ["registro"], category: "registro" },
  { keywords: ["torneira"], category: "torneira" },
  { keywords: ["tinta"], category: "tinta" },
  { keywords: ["conduite"], category: "conduite" },
  { keywords: ["gesso"], category: "gesso" },
  { keywords: ["argila"], category: "argila" },
  { keywords: ["porta"], category: "porta" },
  { keywords: ["janela"], category: "janela" },
  { keywords: ["madeira"], category: "madeira" },
  { keywords: ["prego"], category: "prego" },
  { keywords: ["parafuso"], category: "parafuso" },
  { keywords: ["arame"], category: "arame" },
  { keywords: ["manta"], category: "manta" },
  { keywords: ["chuveiro"], category: "chuveiro" },
  { keywords: ["ralo"], category: "ralo" },
];

const UNIT_RULES: Array<{ patterns: string[]; unit: string }> = [
  { patterns: ["milheiro", "1000 unidades", "1000 un"], unit: "milheiro" },
  { patterns: ["m²", "m2"], unit: "m2" },
  { patterns: ["m³", "m3", "metro cubico"], unit: "m3" },
  { patterns: ["caminhao", "caminhão"], unit: "caminhao" },
  { patterns: ["rolo"], unit: "rolo" },
  { patterns: ["galao", "galão"], unit: "galao" },
  { patterns: ["litro", "lt"], unit: "litro" },
  { patterns: ["barra", "12m", "vergalhao", "vergalhão"], unit: "barra" },
  { patterns: ["50kg", "20kg", "25kg", "40kg", "saco"], unit: "saco" },
  { patterns: ["kg", "quilo"], unit: "kg" },
  { patterns: ["metro", "ml"], unit: "metro" },
  { patterns: ["caixa", "cx"], unit: "caixa" },
];

const CATEGORY_DEFAULT_UNITS: Record<string, string> = {
  cimento: "saco", argamassa: "saco", areia: "m3", brita: "m3",
  bloco: "unidade", tijolo: "unidade", piso: "m2", porcelanato: "m2",
  revestimento: "m2", ferro: "barra", vergalhao: "barra", fio: "metro",
  "cabo eletrico": "metro", tubo: "unidade", cano: "unidade", telha: "unidade",
  tinta: "litro", "caixa dagua": "unidade", gesso: "saco", arame: "kg",
  prego: "kg", parafuso: "caixa", porta: "unidade", janela: "unidade",
  registro: "unidade", torneira: "unidade", chuveiro: "unidade",
  "vaso sanitario": "unidade", ralo: "unidade", "caixa sifonada": "unidade",
  impermeabilizante: "litro", manta: "rolo", conduite: "metro",
  "caixa eletrica": "unidade", argila: "saco", madeira: "metro",
};

function norm(s: string) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }

function detectCategory(name: string): string | null {
  const hay = norm(name);
  for (const e of CATEGORY_KEYWORDS) {
    for (const kw of e.keywords) { if (hay.includes(norm(kw))) return e.category; }
  }
  return null;
}

function detectUnit(name: string, category?: string | null): string {
  const hay = norm(name);
  for (const rule of UNIT_RULES) {
    for (const p of rule.patterns) { if (hay.includes(norm(p))) return rule.unit; }
  }
  if (category && CATEGORY_DEFAULT_UNITS[category]) return CATEGORY_DEFAULT_UNITS[category];
  return "unidade";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    if (action === "validate_prices") {
      return await validateAllPrices(sb);
    } else if (action === "download_images") {
      return await downloadAllImages(sb, supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    } else if (action === "both") {
      const priceResult = await validateAllPricesInner(sb);
      const imageResult = await downloadAllImagesInner(sb, supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      return new Response(JSON.stringify({ ok: true, prices: priceResult, images: imageResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action must be validate_prices, download_images, or both" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("batch-product-ops error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── PRICE VALIDATION ──
async function validateAllPricesInner(sb: any) {
  // Load price intelligence ranges
  const { data: ranges } = await sb.from("price_intelligence").select("*");
  const rangeMap = new Map<string, { min: number; max: number; avg: number }>();
  (ranges || []).forEach((r: any) => {
    rangeMap.set(`${r.categoria}|${r.unidade}`, { min: r.preco_min, max: r.preco_max, avg: r.preco_medio });
  });

  // Load all products
  const { data: products } = await sb.from("store_products").select("id,name,price,promo_price,unit,category").order("created_at", { ascending: true });

  const results = { total: 0, validated: 0, corrected: 0, errors: 0, skipped: 0, details: [] as any[] };
  results.total = (products || []).length;

  for (const p of (products || [])) {
    const category = detectCategory(p.name);
    const unit = detectUnit(p.name, category);

    if (!category) { results.skipped++; continue; }

    const key = `${category}|${unit}`;
    const range = rangeMap.get(key);
    if (!range) { results.skipped++; continue; }

    const price = p.price || 0;

    if (price >= range.min && price <= range.max) {
      results.validated++;
      continue;
    }

    // Try auto-correction
    let corrected = false;
    if (price > range.max) {
      for (const divisor of [10, 100, 1000]) {
        const fixed = Math.round((price / divisor) * 100) / 100;
        if (fixed >= range.min && fixed <= range.max) {
          await sb.from("store_products").update({ price: fixed }).eq("id", p.id);
          await sb.from("system_memory").insert({
            event: "price_auto_corrected",
            entity: "store_products",
            entity_id: p.id,
            impact: "medium",
            details: { original: price, corrected: fixed, divisor, category, unit },
          });
          results.corrected++;
          results.details.push({ id: p.id, name: p.name, original: price, corrected: fixed, action: "corrected" });
          corrected = true;
          break;
        }
      }
    }

    if (!corrected) {
      results.errors++;
      results.details.push({ id: p.id, name: p.name, price, category, unit, range, action: "error" });
      await sb.from("system_memory").insert({
        event: "price_error",
        entity: "store_products",
        entity_id: p.id,
        impact: "high",
        details: { price, category, unit, range_min: range.min, range_max: range.max },
      });
    }
  }

  return results;
}

async function validateAllPrices(sb: any) {
  const results = await validateAllPricesInner(sb);
  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── IMAGE DOWNLOAD ──
async function downloadAllImagesInner(sb: any, supabaseUrl: string, anonKey: string) {
  // Get products without images
  const { data: allProducts } = await sb.from("store_products").select("id,name,category").order("created_at", { ascending: true });
  const { data: allImages } = await sb.from("store_product_images").select("product_id");

  const productsWithImages = new Set((allImages || []).map((i: any) => i.product_id));
  const productsWithoutImages = (allProducts || []).filter((p: any) => !productsWithImages.has(p.id));

  const results = { total: productsWithoutImages.length, success: 0, failed: 0, details: [] as any[] };

  // Process in batches of 5 to avoid overloading
  for (let i = 0; i < productsWithoutImages.length; i += 5) {
    const batch = productsWithoutImages.slice(i, i + 5);

    await Promise.all(batch.map(async (p: any) => {
      try {
        // Call search-product-images to find and import images
        const searchResp = await fetch(`${supabaseUrl}/functions/v1/search-product-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            action: "search",
            productId: p.id,
            productName: p.name,
            category: p.category || detectCategory(p.name) || "",
            maxResults: 3,
          }),
        });

        if (!searchResp.ok) {
          const txt = await searchResp.text();
          console.error(`Search failed for ${p.name}:`, txt);
          results.failed++;
          results.details.push({ id: p.id, name: p.name, action: "search_failed" });
          return;
        }

        const searchData = await searchResp.json();
        const images = searchData?.images || searchData?.results || [];

        if (images.length === 0) {
          results.failed++;
          results.details.push({ id: p.id, name: p.name, action: "no_images_found" });
          return;
        }

        // Import the first valid image
        const importResp = await fetch(`${supabaseUrl}/functions/v1/search-product-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            action: "import",
            productId: p.id,
            images: images.slice(0, 1),
          }),
        });

        if (importResp.ok) {
          results.success++;
          results.details.push({ id: p.id, name: p.name, action: "imported", count: 1 });
          await sb.from("system_memory").insert({
            event: "image_auto_imported",
            entity: "store_products",
            entity_id: p.id,
            impact: "low",
            details: { images_found: images.length, imported: 1 },
          });
        } else {
          const txt = await importResp.text();
          console.error(`Import failed for ${p.name}:`, txt);
          results.failed++;
          results.details.push({ id: p.id, name: p.name, action: "import_failed" });
        }
      } catch (err) {
        console.error(`Error processing ${p.name}:`, err);
        results.failed++;
        results.details.push({ id: p.id, name: p.name, action: "error", error: String(err) });
      }
    }));

    // Small delay between batches
    if (i + 5 < productsWithoutImages.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}

async function downloadAllImages(sb: any, supabaseUrl: string, anonKey: string) {
  const results = await downloadAllImagesInner(sb, supabaseUrl, anonKey);
  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

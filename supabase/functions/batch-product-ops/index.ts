import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Category detection ──
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

/** Paginated fetch — loads ALL rows in pages of PAGE_SIZE */
async function fetchAll(sb: any, table: string, columns: string, orderCol = "created_at") {
  const PAGE_SIZE = 1000;
  let all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select(columns)
      .order(orderCol, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) { console.error(`fetchAll ${table} error:`, error); break; }
    const batch = data ?? [];
    all = all.concat(batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function round2(n: number) { return Math.round(n * 100) / 100; }

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

// ── Smart price fix: tries divisors AND multipliers ──
function tryFixPrice(price: number, range: { min: number; max: number; avg: number }): number | null {
  if (price <= 0) return round2(range.avg);

  // Price too high → try dividing
  if (price > range.max) {
    for (const divisor of [10, 100, 1000]) {
      const fixed = round2(price / divisor);
      if (fixed >= range.min && fixed <= range.max) return fixed;
    }
    // Still too high → clamp to max
    return round2(range.max);
  }

  // Price too low → try multiplying
  if (price < range.min) {
    for (const multiplier of [10, 100, 1000]) {
      const fixed = round2(price * multiplier);
      if (fixed >= range.min && fixed <= range.max) return fixed;
    }
    // Still too low → set to min
    return round2(range.min);
  }

  return null; // already in range
}

// ── PRICE VALIDATION ──
async function validateAllPricesInner(sb: any) {
  const ranges = await fetchAll(sb, "price_intelligence", "*", "categoria");
  const rangeMap = new Map<string, { min: number; max: number; avg: number }>();
  ranges.forEach((r: any) => {
    rangeMap.set(`${r.categoria}|${r.unidade}`, { min: r.preco_min, max: r.preco_max, avg: r.preco_medio });
  });

  const products = await fetchAll(sb, "store_products", "id,name,price,promo_price,unit,category");

  const results = {
    total: products.length,
    validated: 0,
    corrected: 0,
    promo_fixed: 0,
    errors: 0,
    skipped: 0,
    zero_price_fixed: 0,
    details: [] as any[],
    by_category: {} as Record<string, { total: number; ok: number; corrected: number; errors: number }>,
  };

  const addCat = (cat: string, field: "total" | "ok" | "corrected" | "errors") => {
    if (!results.by_category[cat]) results.by_category[cat] = { total: 0, ok: 0, corrected: 0, errors: 0 };
    results.by_category[cat][field]++;
  };

  const BATCH = 200;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const updates: Array<{ id: string; price?: number; promo_price?: number }> = [];

    for (const p of batch) {
      const category = detectCategory(p.name);
      const unit = detectUnit(p.name, category);

      if (!category) { results.skipped++; continue; }

      const key = `${category}|${unit}`;
      const range = rangeMap.get(key);
      if (!range) { results.skipped++; continue; }

      addCat(category, "total");

      const price = Number(p.price) || 0;
      const promo = Number(p.promo_price) || 0;
      const updateObj: { id: string; price?: number; promo_price?: number } = { id: p.id };
      let changed = false;

      // ── Fix main price ──
      if (price <= 0) {
        // Zero/null price → set to category average
        updateObj.price = round2(range.avg);
        changed = true;
        results.zero_price_fixed++;
        if (results.details.length < 300) {
          results.details.push({ id: p.id, name: p.name, original: price, corrected: updateObj.price, category, unit, action: "zero_fixed" });
        }
      } else if (price >= range.min && price <= range.max) {
        // Price OK
      } else {
        const fixed = tryFixPrice(price, range);
        if (fixed !== null && fixed !== price) {
          updateObj.price = fixed;
          changed = true;
          results.corrected++;
          if (results.details.length < 300) {
            results.details.push({ id: p.id, name: p.name, original: price, corrected: fixed, category, unit, action: "corrected" });
          }
        } else {
          results.errors++;
          addCat(category, "errors");
          if (results.details.length < 300) {
            results.details.push({ id: p.id, name: p.name, price, category, unit, range, action: "error" });
          }
          continue;
        }
      }

      // ── Fix promo_price ──
      const effectivePrice = updateObj.price ?? price;
      if (promo > 0) {
        if (promo >= effectivePrice) {
          // Promo >= price → invalid, clear it
          updateObj.promo_price = 0;
          changed = true;
          results.promo_fixed++;
        } else if (promo < range.min * 0.5) {
          // Promo way below range → likely a bug, clear it
          updateObj.promo_price = 0;
          changed = true;
          results.promo_fixed++;
        } else if (promo > range.max) {
          // Promo above range max → fix it
          const promoFixed = tryFixPrice(promo, range);
          if (promoFixed !== null && promoFixed < effectivePrice) {
            updateObj.promo_price = promoFixed;
          } else {
            updateObj.promo_price = 0;
          }
          changed = true;
          results.promo_fixed++;
        }
      }

      if (changed) {
        addCat(category, "corrected");
        updates.push(updateObj);
      } else {
        results.validated++;
        addCat(category, "ok");
      }
    }

    // Apply batch updates
    for (const u of updates) {
      const { id, ...fields } = u;
      if (Object.keys(fields).length > 0) {
        await sb.from("store_products").update(fields).eq("id", id);
      }
    }

    if (i + BATCH < products.length) {
      await new Promise((r) => setTimeout(r, 300));
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
  const allProducts = await fetchAll(sb, "store_products", "id,name,category");
  const allImages = await fetchAll(sb, "store_product_images", "product_id", "product_id");

  const productsWithImages = new Set(allImages.map((i: any) => i.product_id));
  const productsWithoutImages = allProducts.filter((p: any) => !productsWithImages.has(p.id));

  const results = { total: productsWithoutImages.length, success: 0, failed: 0, details: [] as any[] };

  for (let i = 0; i < productsWithoutImages.length; i += 5) {
    const batch = productsWithoutImages.slice(i, i + 5);

    await Promise.all(batch.map(async (p: any) => {
      try {
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
          results.failed++;
          if (results.details.length < 200) results.details.push({ id: p.id, name: p.name, action: "search_failed" });
          return;
        }

        const searchData = await searchResp.json();
        const images = searchData?.images || searchData?.results || [];

        if (images.length === 0) {
          results.failed++;
          if (results.details.length < 200) results.details.push({ id: p.id, name: p.name, action: "no_images_found" });
          return;
        }

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
          if (results.details.length < 200) results.details.push({ id: p.id, name: p.name, action: "imported", count: 1 });
        } else {
          results.failed++;
          if (results.details.length < 200) results.details.push({ id: p.id, name: p.name, action: "import_failed" });
        }
      } catch (err) {
        results.failed++;
        if (results.details.length < 200) results.details.push({ id: p.id, name: p.name, action: "error", error: String(err) });
      }
    }));

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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action } = await req.json();

    if (action === "reclassify") {
      return new Response(JSON.stringify(await reclassify(supabase)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "fix_prices") {
      return new Response(JSON.stringify(await fixPrices(supabase)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "rebuild_fortlev") {
      return new Response(JSON.stringify(await rebuildFortlev(supabase)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "all") {
      const r1 = await reclassify(supabase);
      const r2 = await fixPrices(supabase);
      const r3 = await rebuildFortlev(supabase);
      return new Response(JSON.stringify({ reclassify: r1, fix_prices: r2, rebuild_fortlev: r3 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "action inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ─── CATEGORY MAPPING ──────────────────────────────────────────
const CATEGORY_RULES: Record<string, string[]> = {
  "Hidráulica": [
    "torneira", "registro", "chuveiro", "caixa d'água", "caixa dagua", "caixa d agua",
    "válvula", "valvula", "sifão", "sifao", "ralo", "tanque", "mangueira",
    "tubo pvc", "tubo soldável", "tubo soldavel", "cano", "joelho", "ducha",
    "descarga", "vaso sanitário", "vaso sanitario", "bacia sanitária", "bacia sanitaria",
    "assento sanitário", "assento sanitario", "assento", "boia", "flexível", "flexivel",
    "adaptador", "luva pvc", "cap pvc", "te pvc", "curva pvc", "nipel"
  ],
  "Pisos e Porcelanatos": [
    "porcelanato", "piso", "cerâmica", "ceramica", "revestimento", "retificado",
    "acetinado", "polido", "brilhante", "azulejo", "pastilha", "esmaltado",
    "semigres", "m²", "strufaldi", "cecafi", "fiorano", "duragres", "incefra",
    "ceramica almeida"
  ],
  "Ferramentas": [
    "furadeira", "parafusadeira", "martelo", "serra", "martelete", "trena",
    "nivel", "nível", "alicate", "chave", "esmerilhadeira", "lixadeira",
    "serrote", "desempenadeira"
  ],
  "Pintura": [
    "tinta", "verniz", "selador", "massa corrida", "textura", "pincel",
    "rolo de pintura", "rolo pintura", "lixa", "espátula", "massa acrílica",
    "massa acrilica", "stain", "lata 18l", "lata 3,6l"
  ],
  "Portas e Janelas": [
    "porta ", "janela", "batente", "guarnição", "guarnicao", "marco",
    "porta alumínio", "porta aluminio", "porta madeira", "porta correr",
    "porta pivotante", "janela alumínio", "janela aluminio", "veneziana",
    "vitrô", "vitro"
  ],
};

async function reclassify(supabase: any) {
  // Get categories
  const { data: cats } = await supabase.from("store_categories").select("id, name, active");
  const catMap = new Map(cats.map((c: any) => [c.name, c]));

  // Get "Outros" category id
  const outrosCat = cats.find((c: any) => c.name === "Outros");
  if (!outrosCat) return { error: "Categoria Outros não encontrada" };

  // Get all products in Outros
  const { data: products, error } = await supabase
    .from("store_products")
    .select("id, name")
    .eq("category_id", outrosCat.id);

  if (error) throw error;

  const report: any[] = [];
  const categoriesToActivate = new Set<string>();
  const updates: Record<string, string[]> = {};

  for (const p of products) {
    const nameLower = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const [catName, keywords] of Object.entries(CATEGORY_RULES)) {
      let matches = 0;
      for (const kw of keywords) {
        const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nameLower.includes(kwNorm)) matches++;
      }
      if (matches > bestScore) {
        bestScore = matches;
        bestMatch = catName;
      }
    }

    if (bestMatch && bestScore > 0) {
      const targetCat = catMap.get(bestMatch);
      if (targetCat) {
        if (!targetCat.active) categoriesToActivate.add(bestMatch);
        if (!updates[targetCat.id]) updates[targetCat.id] = [];
        updates[targetCat.id].push(p.id);
        report.push({
          product: p.name,
          from: "Outros",
          to: bestMatch,
          confidence: Math.min(100, bestScore * 35),
        });
      }
    }
  }

  // Activate inactive categories
  for (const catName of categoriesToActivate) {
    const cat = catMap.get(catName);
    if (cat) {
      await supabase.from("store_categories").update({ active: true }).eq("id", cat.id);
    }
  }

  // Batch update products
  let moved = 0;
  for (const [catId, ids] of Object.entries(updates)) {
    // Update in batches of 100
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase
        .from("store_products")
        .update({ category_id: catId, category: Object.entries(updates).find(([k]) => k === catId)?.[0] })
        .in("id", batch);
      if (!error) moved += batch.length;
    }
  }

  // Fix category text field too
  for (const [catId, ids] of Object.entries(updates)) {
    const catObj = cats.find((c: any) => c.id === catId);
    if (catObj) {
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        await supabase.from("store_products").update({ category: catObj.name }).in("id", batch);
      }
    }
  }

  return {
    total_in_outros: products.length,
    moved,
    remaining: products.length - moved,
    categories_activated: [...categoriesToActivate],
    report: report.slice(0, 100),
  };
}

// ─── PRICE FIXING ──────────────────────────────────────────────
async function fixPrices(supabase: any) {
  const { data: intel } = await supabase.from("price_intelligence").select("*");
  const { data: products, error } = await supabase
    .from("store_products")
    .select("id, name, price, category, category_id")
    .eq("active", true);

  if (error) throw error;

  const report: any[] = [];
  let corrected = 0;
  let suspicious = 0;

  // Build category avg map
  const catPrices: Record<string, number[]> = {};
  for (const p of products) {
    const cat = (p.category || "").toLowerCase();
    if (!catPrices[cat]) catPrices[cat] = [];
    if (p.price > 0) catPrices[cat].push(p.price);
  }

  for (const p of products) {
    const nameLower = (p.name || "").toLowerCase();

    // Find matching intelligence entry
    let matched: any = null;
    for (const i of intel || []) {
      if (nameLower.includes(i.categoria.toLowerCase())) {
        matched = i;
        break;
      }
    }

    // Decimal error: price > max * 10 → divide by 100
    if (matched && p.price > matched.preco_max * 10) {
      const newPrice = Math.round(p.price) / 100;
      if (newPrice >= matched.preco_min && newPrice <= matched.preco_max) {
        await supabase.from("store_products").update({ price: newPrice }).eq("id", p.id);
        report.push({ product: p.name, old_price: p.price, new_price: newPrice, reason: "erro_decimal" });
        corrected++;
        continue;
      }
    }

    // Zero price
    if (p.price === 0 || p.price === null) {
      const cat = (p.category || "").toLowerCase();
      const prices = catPrices[cat] || [];
      if (prices.length > 0) {
        const avg = Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length * 100) / 100;
        await supabase.from("store_products").update({ price: avg }).eq("id", p.id);
        report.push({ product: p.name, old_price: 0, new_price: avg, reason: "preco_zero_media_categoria" });
        corrected++;
      }
      continue;
    }

    // Out of range
    if (matched && (p.price < matched.preco_min || p.price > matched.preco_max)) {
      report.push({ product: p.name, price: p.price, min: matched.preco_min, max: matched.preco_max, reason: "fora_da_faixa" });
      suspicious++;
    }
  }

  return { total: products.length, corrected, suspicious, report: report.slice(0, 100) };
}

// ─── REBUILD FORTLEV ───────────────────────────────────────────
async function rebuildFortlev(supabase: any) {
  // Get Hidráulica category
  const { data: cats } = await supabase.from("store_categories").select("id, name").eq("name", "Hidráulica").single();
  const hidraulicaId = cats?.id;

  // Get all Fortlev products
  const { data: fortlevProducts } = await supabase
    .from("store_products")
    .select("id, name, price, category_id")
    .or("name.ilike.%fortlev%");

  const report: any[] = [];

  // Move all Fortlev to Hidráulica
  if (hidraulicaId && fortlevProducts?.length) {
    const ids = fortlevProducts.map((p: any) => p.id);
    for (let i = 0; i < ids.length; i += 100) {
      await supabase
        .from("store_products")
        .update({ category_id: hidraulicaId, category: "Hidráulica" })
        .in("id", ids.slice(i, i + 100));
    }
    report.push({ action: "moved_to_hidraulica", count: ids.length });
  }

  // Remove old images for Fortlev caixa/tanque products
  const fortlevCaixas = (fortlevProducts || []).filter((p: any) =>
    /caixa|tanque/i.test(p.name)
  );

  for (const p of fortlevCaixas) {
    // Get existing images
    const { data: images } = await supabase
      .from("store_product_images")
      .select("id, path")
      .eq("product_id", p.id);

    if (images?.length) {
      // Delete from storage
      const paths = images.map((i: any) => i.path).filter(Boolean);
      if (paths.length) {
        await supabase.storage.from("product-images").remove(paths);
      }
      // Delete records
      await supabase.from("store_product_images").delete().eq("product_id", p.id);
      report.push({ action: "images_removed", product: p.name, count: images.length });
    }
  }

  // Standardize names
  const nameMap: Record<string, string> = {};
  for (const p of fortlevCaixas) {
    const nameLower = p.name.toLowerCase();
    let newName = p.name;

    // Extract capacity
    const capMatch = nameLower.match(/(\d+[\.\d]*)\s*l/);
    const capacity = capMatch ? capMatch[1].replace(".", "") : null;

    if (capacity) {
      if (/industrial/i.test(nameLower)) {
        newName = `Tanque Industrial de Polietileno ${capacity}L - FORTLEV`;
      } else if (/verde/i.test(nameLower)) {
        newName = `Tanque de Polietileno Verde ${capacity}L - FORTLEV`;
      } else if (/tanque/i.test(nameLower) && !/caixa/i.test(nameLower)) {
        newName = `Tanque de Polietileno ${capacity}L - FORTLEV`;
      } else {
        newName = `Caixa d'Água Fortlev ${capacity}L Polietileno`;
      }

      if (newName !== p.name) {
        await supabase.from("store_products").update({ name: newName }).eq("id", p.id);
        nameMap[p.id] = newName;
        report.push({ action: "name_standardized", old: p.name, new: newName });
      }
    }
  }

  return {
    fortlev_total: fortlevProducts?.length || 0,
    caixas_processed: fortlevCaixas.length,
    report: report.slice(0, 100),
  };
}

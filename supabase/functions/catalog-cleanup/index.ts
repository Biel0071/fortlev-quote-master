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
    const json = (d: any) => new Response(JSON.stringify(d), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "reclassify") return json(await reclassify(supabase));
    if (action === "fix_prices") return json(await fixPrices(supabase));
    if (action === "rebuild_fortlev") return json(await rebuildFortlev(supabase));
    if (action === "all") {
      const r1 = await reclassify(supabase);
      const r2 = await fixPrices(supabase);
      const r3 = await rebuildFortlev(supabase);
      return json({ reclassify: r1, fix_prices: r2, rebuild_fortlev: r3 });
    }
    return json({ error: "action inválida" });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ─── HELPERS ───────────────────────────────────────────────────
function norm(s: string) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ─── SCORING-BASED CATEGORY RULES (priority order) ────────────
// Each keyword has a weight. Category with highest total score wins.
// Priority field breaks ties (lower = higher priority).
type ScoredCategory = {
  priority: number;
  keywords: [string, number][];  // [keyword, weight]
};

const SCORED_CATEGORIES: Record<string, ScoredCategory> = {
  "Pisos e Porcelanatos": {
    priority: 1,
    keywords: [
      ["porcelanato", 12], ["piso ceramico", 10], ["ceramica", 8], ["ceramica almeida", 10],
      ["revestimento", 7], ["retificado", 9], ["acetinado", 9], ["polido", 7],
      ["brilhante", 5], ["azulejo", 9], ["m²", 6], ["m2", 6],
      ["incefra", 10], ["duragres", 10], ["fiorano", 10], ["cecafi", 10],
      ["strufaldi", 10], ["semigres", 8], ["esmaltado", 6], ["pastilha", 7],
      ["piso vinilico", 10], ["piso laminado", 10],
    ],
  },
  "Cimentos e Argamassas": {
    priority: 2,
    keywords: [
      ["argamassa", 12], ["cimento", 12], ["rejunte", 10], ["graute", 10],
      ["massa colante", 10], ["massa pronta", 10], ["argamassa colante", 12],
      ["cp ii", 8], ["cp iii", 8], ["cp iv", 8], ["cp v", 8],
      ["votoran", 10], ["quartzolit", 10], ["votorantim", 10],
    ],
  },
  "Hidráulica": {
    priority: 3,
    keywords: [
      ["torneira", 10], ["registro", 8], ["chuveiro", 10], ["caixa d'agua", 10],
      ["caixa dagua", 10], ["caixa d agua", 10], ["valvula", 8], ["sifao", 8],
      ["ralo", 7], ["tanque", 7], ["mangueira", 7], ["tubo pvc", 9],
      ["tubo soldavel", 9], ["cano", 6], ["joelho", 5], ["ducha", 9],
      ["descarga", 9], ["vaso sanitario", 10], ["bacia sanitaria", 10],
      ["assento sanitario", 10], ["assento", 5], ["boia", 5],
      ["flexivel", 5], ["adaptador pvc", 7], ["luva pvc", 7],
      ["cap pvc", 7], ["te pvc", 7], ["curva pvc", 7], ["nipel", 5],
      ["fortlev", 8], ["tigre", 6], ["amanco", 6],
    ],
  },
  "Ferramentas": {
    priority: 4,
    keywords: [
      ["furadeira", 10], ["parafusadeira", 10], ["martelo", 8], ["serra", 7],
      ["martelete", 10], ["trena", 8], ["nivel", 5], ["alicate", 8],
      ["chave", 4], ["esmerilhadeira", 10], ["lixadeira", 10],
      ["serrote", 8], ["desempenadeira", 8], ["makita", 7], ["dewalt", 7],
      ["bosch", 6], ["talhadeira", 8], ["ponteiro", 6],
    ],
  },
  "Pintura": {
    priority: 5,
    keywords: [
      ["tinta", 10], ["verniz", 9], ["selador", 9], ["massa corrida", 10],
      ["textura", 7], ["pincel", 8], ["rolo de pintura", 9], ["rolo pintura", 9],
      ["lixa", 6], ["espatula", 6], ["massa acrilica", 9], ["stain", 7],
      ["lata 18l", 7], ["lata 3,6l", 7], ["coral", 7], ["suvinil", 7],
      ["eucatex", 6],
    ],
  },
  "Telhas e Coberturas": {
    priority: 6,
    keywords: [
      ["telha", 10], ["cumeeira", 10], ["rufo", 9], ["calha", 8],
      ["eternit", 8], ["brasilit", 8], ["fibrocimento", 9],
    ],
  },
  "Estruturas": {
    priority: 7,
    keywords: [
      ["vergalhao", 10], ["coluna", 7], ["viga", 7], ["trelica", 9],
      ["malha", 6], ["ferro", 5], ["armacao", 8], ["arame", 6],
      ["gerdau", 8], ["ca50", 9], ["ca60", 9],
    ],
  },
  "Portas e Janelas": {
    priority: 8,
    keywords: [
      ["porta ", 8], ["janela", 9], ["batente", 9], ["guarnicao", 8],
      ["marco", 6], ["porta aluminio", 10], ["porta madeira", 10],
      ["porta correr", 10], ["porta pivotante", 10], ["janela aluminio", 10],
      ["veneziana", 9], ["vitro", 7],
    ],
  },
  "Elétrica": {
    priority: 9,
    keywords: [
      ["fio", 5], ["cabo", 5], ["disjuntor", 10], ["tomada", 9],
      ["interruptor", 9], ["quadro distribuicao", 10], ["condulete", 9],
      ["eletroduto", 9], ["lampada", 8], ["luminaria", 8],
      ["led", 4], ["reator", 8], ["pial", 7], ["tramontina", 5],
    ],
  },
};

// Negative keywords: if product name matches, EXCLUDE from category
const NEGATIVE_RULES: Record<string, string[]> = {
  "Pisos e Porcelanatos": ["argamassa", "rejunte", "massa colante", "cimento", "graute"],
  "Ferramentas": ["porcelanato", "ceramica", "piso", "azulejo", "revestimento"],
};

function scoreProduct(productName: string): { category: string; score: number; confidence: number } | null {
  const nameLower = norm(productName);
  const results: { cat: string; score: number; priority: number }[] = [];

  for (const [catName, config] of Object.entries(SCORED_CATEGORIES)) {
    let totalScore = 0;
    const negatives = NEGATIVE_RULES[catName] || [];

    // Check negative rules: if a negative keyword is found, reduce priority heavily
    let hasNegative = false;
    for (const neg of negatives) {
      if (nameLower.includes(norm(neg))) {
        hasNegative = true;
        break;
      }
    }

    for (const [kw, weight] of config.keywords) {
      if (nameLower.includes(norm(kw))) {
        totalScore += weight;
      }
    }

    if (totalScore > 0) {
      // Penalize if negative keyword found
      if (hasNegative) totalScore = Math.floor(totalScore * 0.3);
      results.push({ cat: catName, score: totalScore, priority: config.priority });
    }
  }

  if (results.length === 0) return null;

  // Sort by score desc, then priority asc (lower = better)
  results.sort((a, b) => b.score - a.score || a.priority - b.priority);

  const best = results[0];
  // Minimum threshold: score must be >= 7
  if (best.score < 7) return null;

  const confidence = Math.min(100, best.score * 5);
  return { category: best.cat, score: best.score, confidence };
}

// ─── RECLASSIFY ────────────────────────────────────────────────
async function reclassify(supabase: any) {
  const { data: cats } = await supabase.from("store_categories").select("id, name, active");
  const catMap = new Map(cats.map((c: any) => [c.name, c]));

  // Also try to create missing categories
  const neededCats = Object.keys(SCORED_CATEGORIES);
  for (const name of neededCats) {
    if (!catMap.has(name)) {
      const { data: newCat } = await supabase.from("store_categories")
        .insert({ name, active: true })
        .select("id, name, active")
        .single();
      if (newCat) catMap.set(name, newCat);
    }
  }

  // Get ALL products (not just Outros) to re-audit
  const allProducts: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("store_products")
      .select("id, name, category, category_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allProducts.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Find the "Outros" category id
  const outrosCat = cats.find((c: any) => c.name === "Outros");
  const outrosId = outrosCat?.id;

  const report: any[] = [];
  const categoriesToActivate = new Set<string>();
  const updates: { id: string; catId: string; catName: string }[] = [];

  for (const p of allProducts) {
    const isOutros = p.category_id === outrosId || (p.category || "").toLowerCase() === "outros";
    const result = scoreProduct(p.name);

    if (!result) continue;

    const targetCat = catMap.get(result.category);
    if (!targetCat) continue;

    // Skip if already correctly classified
    if (p.category_id === targetCat.id) continue;

    // For non-Outros products, only reclassify if confidence is very high (>=80)
    if (!isOutros && result.confidence < 80) continue;

    if (!targetCat.active) categoriesToActivate.add(result.category);

    updates.push({ id: p.id, catId: targetCat.id, catName: result.category });
    report.push({
      product: p.name,
      from: p.category || "Outros",
      to: result.category,
      score: result.score,
      confidence: result.confidence,
      motivo: `Score ${result.score} (keywords matched)`,
    });
  }

  // Activate inactive categories
  for (const catName of categoriesToActivate) {
    const cat = catMap.get(catName);
    if (cat) await supabase.from("store_categories").update({ active: true }).eq("id", cat.id);
  }

  // Batch update products by category
  const byCat: Record<string, { catName: string; ids: string[] }> = {};
  for (const u of updates) {
    if (!byCat[u.catId]) byCat[u.catId] = { catName: u.catName, ids: [] };
    byCat[u.catId].ids.push(u.id);
  }

  let moved = 0;
  for (const [catId, { catName, ids }] of Object.entries(byCat)) {
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase
        .from("store_products")
        .update({ category_id: catId, category: catName })
        .in("id", batch);
      if (!error) moved += batch.length;
    }
  }

  return {
    total_products: allProducts.length,
    moved,
    categories_activated: [...categoriesToActivate],
    report: report.slice(0, 200),
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

  const catPrices: Record<string, number[]> = {};
  for (const p of products) {
    const cat = (p.category || "").toLowerCase();
    if (!catPrices[cat]) catPrices[cat] = [];
    if (p.price > 0) catPrices[cat].push(p.price);
  }

  for (const p of products) {
    const nameLower = norm(p.name);
    let matched: any = null;
    for (const i of intel || []) {
      if (nameLower.includes(norm(i.categoria))) { matched = i; break; }
    }

    if (matched && p.price > matched.preco_max * 10) {
      const newPrice = Math.round(p.price) / 100;
      if (newPrice >= matched.preco_min && newPrice <= matched.preco_max) {
        await supabase.from("store_products").update({ price: newPrice }).eq("id", p.id);
        report.push({ product: p.name, old_price: p.price, new_price: newPrice, reason: "erro_decimal" });
        corrected++;
        continue;
      }
    }

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

    if (matched && (p.price < matched.preco_min || p.price > matched.preco_max)) {
      report.push({ product: p.name, price: p.price, min: matched.preco_min, max: matched.preco_max, reason: "fora_da_faixa" });
      suspicious++;
    }
  }

  return { total: products.length, corrected, suspicious, report: report.slice(0, 100) };
}

// ─── REBUILD FORTLEV ───────────────────────────────────────────
async function rebuildFortlev(supabase: any) {
  const { data: cats } = await supabase.from("store_categories").select("id, name").eq("name", "Hidráulica").single();
  const hidraulicaId = cats?.id;

  const { data: fortlevProducts } = await supabase
    .from("store_products")
    .select("id, name, price, category_id")
    .or("name.ilike.%fortlev%");

  const report: any[] = [];

  if (hidraulicaId && fortlevProducts?.length) {
    const ids = fortlevProducts.map((p: any) => p.id);
    for (let i = 0; i < ids.length; i += 100) {
      await supabase.from("store_products")
        .update({ category_id: hidraulicaId, category: "Hidráulica" })
        .in("id", ids.slice(i, i + 100));
    }
    report.push({ action: "moved_to_hidraulica", count: ids.length });
  }

  const fortlevCaixas = (fortlevProducts || []).filter((p: any) => /caixa|tanque/i.test(p.name));

  for (const p of fortlevCaixas) {
    const { data: images } = await supabase.from("store_product_images").select("id, path").eq("product_id", p.id);
    if (images?.length) {
      const paths = images.map((i: any) => i.path).filter(Boolean);
      if (paths.length) await supabase.storage.from("product-images").remove(paths);
      await supabase.from("store_product_images").delete().eq("product_id", p.id);
      report.push({ action: "images_removed", product: p.name, count: images.length });
    }
  }

  for (const p of fortlevCaixas) {
    const nameLower = p.name.toLowerCase();
    let newName = p.name;
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

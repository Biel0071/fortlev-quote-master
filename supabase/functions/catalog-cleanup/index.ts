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

// ─── OFFICIAL FORTLEV CATALOG (source of truth from quotation system) ──
const FORTLEV_CATALOG: {
  capacity: number;
  type: "caixa" | "tanque" | "tanque_industrial" | "tanque_verde";
  name: string;
  price: number;
  sku: string;
}[] = [
  // Caixas d'Água de Polietileno
  { capacity: 100, type: "caixa", name: "Caixa d'Água de Polietileno 100L - Fortlev", price: 89.00, sku: "FORTLEV-CX-100" },
  { capacity: 150, type: "caixa", name: "Caixa d'Água de Polietileno 150L - Fortlev", price: 115.00, sku: "FORTLEV-CX-150" },
  { capacity: 250, type: "caixa", name: "Caixa d'Água de Polietileno 250L - Fortlev", price: 149.00, sku: "FORTLEV-CX-250" },
  { capacity: 310, type: "caixa", name: "Caixa d'Água de Polietileno 310L - Fortlev", price: 169.00, sku: "FORTLEV-CX-310" },
  { capacity: 500, type: "caixa", name: "Caixa d'Água de Polietileno 500L - Fortlev", price: 190.00, sku: "FORTLEV-CX-500" },
  { capacity: 750, type: "caixa", name: "Caixa d'Água de Polietileno 750L - Fortlev", price: 219.00, sku: "FORTLEV-CX-750" },
  { capacity: 1000, type: "caixa", name: "Caixa d'Água de Polietileno 1000L - Fortlev", price: 249.00, sku: "FORTLEV-CX-1000" },
  { capacity: 1500, type: "caixa", name: "Caixa d'Água de Polietileno 1500L - Fortlev", price: 399.00, sku: "FORTLEV-CX-1500" },
  { capacity: 2000, type: "caixa", name: "Caixa d'Água de Polietileno 2000L - Fortlev", price: 520.00, sku: "FORTLEV-CX-2000" },
  { capacity: 3000, type: "caixa", name: "Caixa d'Água de Polietileno 3000L - Fortlev", price: 650.00, sku: "FORTLEV-CX-3000" },
  { capacity: 5000, type: "caixa", name: "Caixa d'Água de Polietileno 5000L - Fortlev", price: 1699.00, sku: "FORTLEV-CX-5000" },
  { capacity: 7500, type: "caixa", name: "Caixa d'Água de Polietileno 7500L - Fortlev", price: 2699.00, sku: "FORTLEV-CX-7500" },
  { capacity: 10000, type: "caixa", name: "Caixa d'Água de Polietileno 10000L - Fortlev", price: 2999.00, sku: "FORTLEV-CX-10000" },
  { capacity: 15000, type: "caixa", name: "Caixa d'Água de Polietileno 15000L - Fortlev", price: 4200.00, sku: "FORTLEV-CX-15000" },
  { capacity: 20000, type: "caixa", name: "Caixa d'Água de Polietileno 20000L - Fortlev", price: 5500.00, sku: "FORTLEV-CX-20000" },

  // Tanques de Polietileno
  { capacity: 1000, type: "tanque", name: "Tanque de Polietileno 1000L - Fortlev", price: 266.00, sku: "FORTLEV-TQ-1000" },
  { capacity: 2000, type: "tanque", name: "Tanque de Polietileno 2000L - Fortlev", price: 556.00, sku: "FORTLEV-TQ-2000" },
  { capacity: 3000, type: "tanque", name: "Tanque de Polietileno 3000L - Fortlev", price: 696.00, sku: "FORTLEV-TQ-3000" },
  { capacity: 5000, type: "tanque", name: "Tanque de Polietileno 5000L - Fortlev", price: 1818.00, sku: "FORTLEV-TQ-5000" },
  { capacity: 10000, type: "tanque", name: "Tanque de Polietileno 10000L - Fortlev", price: 3209.00, sku: "FORTLEV-TQ-10000" },
  { capacity: 15000, type: "tanque", name: "Tanque de Polietileno 15000L - Fortlev", price: 4494.00, sku: "FORTLEV-TQ-15000" },
  { capacity: 20000, type: "tanque", name: "Tanque de Polietileno 20000L - Fortlev", price: 5885.00, sku: "FORTLEV-TQ-20000" },

  // Tanques Industriais
  { capacity: 10000, type: "tanque_industrial", name: "Tanque Industrial de Polietileno 10000L - Fortlev", price: 3359.00, sku: "FORTLEV-TI-10000" },
  { capacity: 15000, type: "tanque_industrial", name: "Tanque Industrial de Polietileno 15000L - Fortlev", price: 4704.00, sku: "FORTLEV-TI-15000" },
  { capacity: 20000, type: "tanque_industrial", name: "Tanque Industrial de Polietileno 20000L - Fortlev", price: 6160.00, sku: "FORTLEV-TI-20000" },

  // Tanques Verdes
  { capacity: 10000, type: "tanque_verde", name: "Tanque de Polietileno Verde 10000L - Fortlev", price: 3299.00, sku: "FORTLEV-TV-10000" },
  { capacity: 15000, type: "tanque_verde", name: "Tanque de Polietileno Verde 15000L - Fortlev", price: 4620.00, sku: "FORTLEV-TV-15000" },
  { capacity: 20000, type: "tanque_verde", name: "Tanque de Polietileno Verde 20000L - Fortlev", price: 6050.00, sku: "FORTLEV-TV-20000" },
];

// ─── SCORING-BASED CATEGORY RULES (priority order) ────────────
type ScoredCategory = { priority: number; keywords: [string, number][] };

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
    keywords: [["telha", 10], ["cumeeira", 10], ["rufo", 9], ["calha", 8], ["eternit", 8], ["brasilit", 8], ["fibrocimento", 9]],
  },
  "Estruturas": {
    priority: 7,
    keywords: [["vergalhao", 10], ["coluna", 7], ["viga", 7], ["trelica", 9], ["malha", 6], ["ferro", 5], ["armacao", 8], ["arame", 6], ["gerdau", 8], ["ca50", 9], ["ca60", 9]],
  },
  "Portas e Janelas": {
    priority: 8,
    keywords: [["porta ", 8], ["janela", 9], ["batente", 9], ["guarnicao", 8], ["marco", 6], ["porta aluminio", 10], ["porta madeira", 10], ["porta correr", 10], ["porta pivotante", 10], ["janela aluminio", 10], ["veneziana", 9], ["vitro", 7]],
  },
  "Elétrica": {
    priority: 9,
    keywords: [["fio", 5], ["cabo", 5], ["disjuntor", 10], ["tomada", 9], ["interruptor", 9], ["quadro distribuicao", 10], ["condulete", 9], ["eletroduto", 9], ["lampada", 8], ["luminaria", 8], ["led", 4], ["reator", 8], ["pial", 7], ["tramontina", 5]],
  },
};

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
    let hasNegative = false;
    for (const neg of negatives) {
      if (nameLower.includes(norm(neg))) { hasNegative = true; break; }
    }
    for (const [kw, weight] of config.keywords) {
      if (nameLower.includes(norm(kw))) totalScore += weight;
    }
    if (totalScore > 0) {
      if (hasNegative) totalScore = Math.floor(totalScore * 0.3);
      results.push({ cat: catName, score: totalScore, priority: config.priority });
    }
  }

  if (results.length === 0) return null;
  results.sort((a, b) => b.score - a.score || a.priority - b.priority);
  const best = results[0];
  if (best.score < 7) return null;
  return { category: best.cat, score: best.score, confidence: Math.min(100, best.score * 5) };
}

// ─── RECLASSIFY ────────────────────────────────────────────────
async function reclassify(supabase: any) {
  const { data: cats } = await supabase.from("store_categories").select("id, name, active");
  const catMap = new Map(cats.map((c: any) => [c.name, c]));

  const neededCats = Object.keys(SCORED_CATEGORIES);
  for (const name of neededCats) {
    if (!catMap.has(name)) {
      const { data: newCat } = await supabase.from("store_categories").insert({ name, active: true }).select("id, name, active").single();
      if (newCat) catMap.set(name, newCat);
    }
  }

  const allProducts: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from("store_products").select("id, name, category, category_id").range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allProducts.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

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
    if (p.category_id === targetCat.id) continue;
    if (!isOutros && result.confidence < 80) continue;
    if (!targetCat.active) categoriesToActivate.add(result.category);
    updates.push({ id: p.id, catId: targetCat.id, catName: result.category });
    report.push({ product: p.name, from: p.category || "Outros", to: result.category, score: result.score, confidence: result.confidence });
  }

  for (const catName of categoriesToActivate) {
    const cat = catMap.get(catName);
    if (cat) await supabase.from("store_categories").update({ active: true }).eq("id", cat.id);
  }

  const byCat: Record<string, { catName: string; ids: string[] }> = {};
  for (const u of updates) {
    if (!byCat[u.catId]) byCat[u.catId] = { catName: u.catName, ids: [] };
    byCat[u.catId].ids.push(u.id);
  }

  let moved = 0;
  for (const [catId, { catName, ids }] of Object.entries(byCat)) {
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase.from("store_products").update({ category_id: catId, category: catName }).in("id", batch);
      if (!error) moved += batch.length;
    }
  }

  return { total_products: allProducts.length, moved, categories_activated: [...categoriesToActivate], report: report.slice(0, 200) };
}

// ─── PRICE FIXING ──────────────────────────────────────────────
async function fixPrices(supabase: any) {
  const { data: intel } = await supabase.from("price_intelligence").select("*");
  const { data: products, error } = await supabase.from("store_products").select("id, name, price, category, category_id").eq("active", true);
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

function extractCapacity(name: string): number | null {
  // Match patterns like "10.000L", "10000L", "1000 L", "1000lts", "100L"
  const m = name.match(/(\d[\d.]*)\s*l/i);
  if (!m) return null;
  return parseInt(m[1].replace(/\./g, ""), 10);
}

type FortlevType = "caixa" | "tanque" | "tanque_industrial" | "tanque_verde" | "fossa" | "outro";

function classifyFortlev(name: string): FortlevType {
  const n = norm(name);
  if (n.includes("fossa")) return "fossa";
  if (n.includes("industrial")) return "tanque_industrial";
  if (n.includes("verde")) return "tanque_verde";
  if (n.includes("tanque")) return "tanque";
  if (n.includes("caixa") && (n.includes("agua") || n.includes("polietileno"))) return "caixa";
  if (n.includes("reservatorio")) return "caixa";
  return "outro";
}

function fortlevDescription(type: FortlevType, capacity: number): string {
  const isTanque = type === "tanque" || type === "tanque_industrial" || type === "tanque_verde";
  const typeLabel = isTanque
    ? `Tanque de Polietileno ${capacity}L`
    : `Caixa d'Água de Polietileno ${capacity}L`;

  const usage = isTanque
    ? "Ideal para armazenamento de água em propriedades rurais, indústrias e comércios."
    : "Indicada para residências, comércios e pequenas instalações.";

  return `A ${typeLabel} Fortlev é fabricada em polietileno de alta resistência, garantindo durabilidade e vedação segura.

${usage}

**Características:**
• Fabricada em polietileno de alta densidade
• Alta resistência mecânica e química
• Tampa com vedação segura
• Proteção UV
• Fácil instalação e manutenção
• Produto original Fortlev com garantia de fábrica

**Capacidade:** ${capacity.toLocaleString("pt-BR")} litros`;
}

// ─── IMAGE SEARCH ──────────────────────────────────────────────

async function searchGoogleImages(query: string, apiKey: string, cx: string): Promise<{ url: string; title: string; displayLink: string }[]> {
  const googleUrl = new URL("https://www.googleapis.com/customsearch/v1");
  googleUrl.searchParams.set("key", apiKey);
  googleUrl.searchParams.set("cx", cx);
  googleUrl.searchParams.set("q", query);
  googleUrl.searchParams.set("searchType", "image");
  googleUrl.searchParams.set("num", "10");
  googleUrl.searchParams.set("imgSize", "large");

  try {
    const resp = await fetch(googleUrl.toString());
    if (!resp.ok) {
      console.error(`Google API error ${resp.status}`);
      return [];
    }
    const payload = await resp.json();
    return (Array.isArray(payload?.items) ? payload.items : []).map((item: any) => ({
      url: item?.link || "",
      title: item?.title || "",
      displayLink: item?.displayLink || "",
    })).filter((i: any) => i.url);
  } catch { return []; }
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "GET", signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return "";
    return await response.text();
  } catch { return ""; } finally { clearTimeout(timeout); }
}

async function searchDuckDuckGoImages(query: string): Promise<{ url: string; title: string; displayLink: string }[]> {
  const html = await fetchHtml(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`);
  if (!html) return [];
  const vqd = html.match(/vqd=['"]([^'"]+)['"]/i)?.[1] ?? html.match(/"vqd":"([^"]+)"/i)?.[1] ?? "";
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
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0",
        Referer: "https://duckduckgo.com/",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json,text/javascript,*/*;q=0.1",
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (Array.isArray(data?.results) ? data.results : []).map((item: any) => ({
      url: String(item?.image || ""),
      title: String(item?.title || ""),
      displayLink: String(item?.source || ""),
    })).filter((i: any) => i.url && i.url.startsWith("http"));
  } catch { return []; }
}

async function downloadAndStoreImage(
  supabase: any, imageUrl: string, productId: string, index: number
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0" },
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("image")) return null;

    const blob = await resp.blob();
    if (blob.size < 5000) return null; // too small = likely placeholder

    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const path = `${productId}/${index}.${ext}`;

    const arrayBuffer = await blob.arrayBuffer();
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, arrayBuffer, { contentType: ct, upsert: true });

    if (error) { console.error(`Upload error for ${path}:`, error.message); return null; }
    return path;
  } catch { return null; }
}

async function searchFortlevImages(
  supabase: any,
  productId: string,
  type: FortlevType,
  capacity: number
): Promise<{ saved: number; errors: string[] }> {
  const errors: string[] = [];
  const isCaixa = type === "caixa";
  const isTanqueIndustrial = type === "tanque_industrial";
  const isTanqueVerde = type === "tanque_verde";
  const isTanque = type === "tanque" || isTanqueIndustrial || isTanqueVerde;

  // Build type-specific queries — CRITICAL: never mix caixa/tanque terms
  let queries: string[];
  if (isCaixa) {
    queries = [
      `caixa d'água Fortlev ${capacity}L polietileno produto`,
      `Fortlev caixa d'água ${capacity} litros polietileno foto produto`,
      `caixa dagua polietileno ${capacity}L Fortlev azul`,
    ];
  } else if (isTanqueIndustrial) {
    queries = [
      `tanque industrial Fortlev ${capacity}L polietileno produto`,
      `Fortlev tanque industrial polietileno ${capacity} litros`,
    ];
  } else if (isTanqueVerde) {
    queries = [
      `tanque Fortlev verde ${capacity}L polietileno produto`,
      `Fortlev tanque polietileno verde ${capacity} litros`,
    ];
  } else {
    queries = [
      `tanque Fortlev ${capacity}L polietileno produto`,
      `Fortlev tanque polietileno ${capacity} litros foto`,
    ];
  }

  const allImages: { url: string; title: string; displayLink: string }[] = [];

  // Try Google first (better quality results)
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
  const GOOGLE_CX = Deno.env.get("GOOGLE_CX");
  if (GOOGLE_API_KEY && GOOGLE_CX) {
    for (const q of queries) {
      if (allImages.length >= 20) break;
      console.log(`[fortlev] Google search: "${q}"`);
      const results = await searchGoogleImages(q, GOOGLE_API_KEY, GOOGLE_CX);
      console.log(`[fortlev] Google got ${results.length} results`);
      for (const r of results) {
        if (!allImages.some(i => i.url === r.url)) allImages.push(r);
      }
    }
  }

  // Fallback to DuckDuckGo
  if (allImages.length < 5) {
    for (const q of queries) {
      if (allImages.length >= 20) break;
      console.log(`[fortlev] DDG search: "${q}"`);
      const results = await searchDuckDuckGoImages(q);
      console.log(`[fortlev] DDG got ${results.length} results`);
      for (const r of results) {
        if (!allImages.some(i => i.url === r.url)) allImages.push(r);
      }
    }
  }

  console.log(`[fortlev] Total unique images for ${type} ${capacity}L: ${allImages.length}`);

  // ── Strict scoring with type-aware filtering ──
  const invalidKeywords = ["banner", "logo", "sprite", "icon", "favicon", "carrinho", "loja", "menu", "svg", "gif", "site", "header", "footer"];
  const invalidUrlPatterns = ["facebook", "instagram", "youtube", "twitter", "tiktok", "whatsapp"];

  const scored = allImages.map((img) => {
    const text = norm(img.title + " " + img.url + " " + img.displayLink);
    let score = 0;

    // HARD REJECT: invalid images
    for (const kw of invalidKeywords) if (text.includes(kw)) return { ...img, score: -100 };
    for (const kw of invalidUrlPatterns) if (text.includes(kw)) return { ...img, score: -100 };

    // Official source bonus
    if (text.includes("fortlev.com")) score += 10;
    if (text.includes("fortlev")) score += 4;

    // Capacity match
    if (text.includes(String(capacity))) score += 5;

    // ── CRITICAL: Type cross-contamination prevention ──
    if (isCaixa) {
      // Boost caixa-specific keywords
      if (text.includes("caixa")) score += 6;
      if (text.includes("reservatorio")) score += 4;
      if (text.includes("azul")) score += 3;
      // HARD PENALTY for tanque keywords (cross-contamination)
      if (text.includes("tanque")) score -= 15;
      if (text.includes("industrial")) score -= 15;
      if (text.includes("verde") && !text.includes("caixa")) score -= 10;
    } else if (isTanque) {
      // Boost tanque-specific keywords
      if (text.includes("tanque")) score += 6;
      // HARD PENALTY for caixa keywords
      if (text.includes("caixa") && !text.includes("tanque")) score -= 15;
      if (isTanqueIndustrial && text.includes("industrial")) score += 6;
      if (isTanqueVerde && text.includes("verde")) score += 6;
    }

    // Prefer frontal/product photos (these should be main image)
    if (text.includes("produto") || text.includes("frontal") || text.includes("isolated")) score += 4;
    if (text.includes("fundo branco") || text.includes("recorte") || text.includes("recortada")) score += 3;
    // Product detail keywords
    if (text.includes("tampa")) score += 1;
    if (text.includes("borda")) score += 1;
    if (text.includes("detalhe")) score += 1;

    // Prefer polietileno mention
    if (text.includes("polietileno")) score += 3;

    return { ...img, score };
  });

  // Sort by score desc, filter positive only
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, 4);

  if (top.length === 0) {
    errors.push(`No valid images found for ${type} ${capacity}L (${allImages.length} candidates all filtered)`);
    return { saved: 0, errors };
  }

  // Download and store - sort_order 0 = frontal/main image
  let saved = 0;
  for (let i = 0; i < top.length; i++) {
    console.log(`[fortlev] Downloading #${i} (score=${top[i].score}): ${top[i].url.slice(0, 80)}`);
    const path = await downloadAndStoreImage(supabase, top[i].url, productId, i);
    if (path) {
      await supabase.from("store_product_images").insert({
        product_id: productId,
        path,
        sort_order: i,
      });
      saved++;
    }
  }

  if (saved === 0) errors.push(`All image downloads failed for ${type} ${capacity}L`);
  return { saved, errors };
}

async function rebuildFortlev(supabase: any) {
  // Get Hidráulica category
  const { data: hidCat } = await supabase.from("store_categories").select("id, name").eq("name", "Hidráulica").single();
  const hidraulicaId = hidCat?.id;

  // Fetch ALL fortlev products from store
  const { data: allFortlev } = await supabase
    .from("store_products")
    .select("id, name, price, category_id, description, sku")
    .or("name.ilike.%fortlev%,name.ilike.%caixa d%polietileno%,name.ilike.%tanque de polietileno%");

  if (!allFortlev || allFortlev.length === 0) {
    return { fortlev_total: 0, report: [], message: "Nenhum produto Fortlev encontrado" };
  }

  const report: any[] = [];
  let namesFixed = 0;
  let pricesUpdated = 0;
  let skusGenerated = 0;
  let imagesRemoved = 0;
  let imagesImported = 0;
  let descriptionsGenerated = 0;
  const noMatch: string[] = [];
  const allErrors: string[] = [];

  for (const p of allFortlev) {
    const type = classifyFortlev(p.name);
    const capacity = extractCapacity(p.name);

    // Skip non-Fortlev types
    if (type === "outro") {
      report.push({ product: p.name, action: "skipped", reason: "tipo não identificado como Fortlev" });
      continue;
    }
    if (type === "fossa") {
      report.push({ product: p.name, action: "skipped", reason: "fossa séptica - mantém original" });
      continue;
    }
    if (!capacity) {
      report.push({ product: p.name, action: "skipped", reason: "capacidade não detectada" });
      continue;
    }

    // ── Match with official catalog ──
    const catalogMatch = FORTLEV_CATALOG.find(c => c.capacity === capacity && c.type === type);

    const updateData: Record<string, any> = {};

    if (catalogMatch) {
      // Use official name, price, sku
      if (p.name !== catalogMatch.name) {
        updateData.name = catalogMatch.name;
        namesFixed++;
      }
      if (p.price !== catalogMatch.price) {
        updateData.price = catalogMatch.price;
        pricesUpdated++;
      }
      if (p.sku !== catalogMatch.sku) {
        updateData.sku = catalogMatch.sku;
        skusGenerated++;
      }
    } else {
      noMatch.push(`${p.name} (${type} ${capacity}L)`);
    }

    // Move to Hidráulica
    if (hidraulicaId && p.category_id !== hidraulicaId) {
      updateData.category_id = hidraulicaId;
      updateData.category = "Hidráulica";
    }

    // Generate description
    const desc = fortlevDescription(type, capacity);
    updateData.description = desc;
    updateData.status = "published";
    descriptionsGenerated++;

    // Apply updates
    if (Object.keys(updateData).length > 0) {
      await supabase.from("store_products").update(updateData).eq("id", p.id);
    }

    // ── Clean old images ──
    const { data: oldImages } = await supabase.from("store_product_images").select("id, path").eq("product_id", p.id);
    if (oldImages?.length) {
      const paths = oldImages.map((i: any) => i.path).filter(Boolean);
      if (paths.length) {
        try { await supabase.storage.from("product-images").remove(paths); } catch (_) {}
      }
      await supabase.from("store_product_images").delete().eq("product_id", p.id);
      imagesRemoved += oldImages.length;
    }

    // ── Search and import correct images ──
    const imgResult = await searchFortlevImages(supabase, p.id, type, capacity);
    imagesImported += imgResult.saved;
    if (imgResult.errors.length) allErrors.push(...imgResult.errors);

    report.push({
      product: catalogMatch?.name || p.name,
      type,
      capacity,
      name_updated: !!updateData.name,
      price_updated: !!updateData.price,
      sku: catalogMatch?.sku || "N/A",
      images_removed: oldImages?.length || 0,
      images_imported: imgResult.saved,
      catalog_match: !!catalogMatch,
    });
  }

  return {
    fortlev_total: allFortlev.length,
    produtos_reconstruidos: report.filter(r => r.action !== "skipped").length,
    nomes_corrigidos: namesFixed,
    precos_atualizados: pricesUpdated,
    skus_gerados: skusGenerated,
    imagens_removidas: imagesRemoved,
    imagens_importadas: imagesImported,
    descricoes_geradas: descriptionsGenerated,
    produtos_sem_correspondencia: noMatch,
    erros: allErrors.slice(0, 20),
    report: report.slice(0, 100),
  };
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Types ── */
type ImageSource = "bing" | "google" | "mercado_livre" | "amazon" | "shopee" | "alibaba";

type SearchResult = {
  imageUrl: string;
  thumbnail: string;
  title: string;
  source: ImageSource;
  width?: number;
  height?: number;
  heuristicScore?: number;
};

type ImportBody = {
  action: "import";
  productId: string;
  images: SearchResult[];
};

type PipelineBody = {
  action: "pipeline";
  productId: string;
  autoApprove?: boolean;
  maxImages?: number;
};

/* ── Helpers ── */
function safeText(input: unknown, max = 300) {
  return String(input ?? "").trim().slice(0, max);
}

function normalizeQuery(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function extFromContentType(ct: string | null) {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  return "jpg";
}

function parseSource(raw: string | null): ImageSource {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "google") return "google";
  if (v === "mercado_livre") return "mercado_livre";
  if (v === "amazon") return "amazon";
  if (v === "shopee") return "shopee";
  if (v === "alibaba") return "alibaba";
  return "bing";
}

function sourceLabel(source: ImageSource) {
  const map: Record<ImageSource, string> = {
    google: "Google Images", mercado_livre: "Mercado Livre", amazon: "Amazon",
    shopee: "Shopee", alibaba: "Alibaba", bing: "Bing Images",
  };
  return map[source] || "Bing Images";
}

function parseNum(raw?: string | number) {
  if (raw === undefined || raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
}

function decodeEscaped(value: string) {
  return value.replace(/\\u002f/g, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/\\"/g, '"').replace(/\\n/g, " ");
}

function normalizeUrl(raw: string, baseUrl: string) {
  const cleaned = decodeEscaped(raw.trim());
  if (!cleaned) return "";
  if (cleaned.startsWith("//")) return `https:${cleaned}`;
  try { return new URL(cleaned, baseUrl).toString(); } catch { return ""; }
}

/* ── Technical Filters ── */
const BLOCKED_HOSTS = ["r.bing.com", "bing.com", "duckduckgo.com", "gstatic.com", "pinterest.com", "instagram.com", "facebook.com", "twitter.com", "tiktok.com"];
const URL_BLACKLIST = ["logo", "icon", "sprite", "banner", "svg", "social", "profile", "avatar", "favicon", "selo", "badge", "watermark", "marca-dagua", "marca_dagua", "placeholder"];
const TITLE_REJECTION = [
  "kitchen", "bathroom", "living room", "bedroom", "dining room",
  "interior design", "room design", "home decor", "decoration",
  "showroom", "ambiente", "cozinha decorada", "banheiro decorado",
  "sala decorada", "quarto decorado", "ambiente decorado",
  "projeto de interiores", "inspiração", "inspiration",
  "before and after", "antes e depois", "renovation", "reforma completa", "tour", "house tour",
];

function isBlockedHost(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_HOSTS.some(b => host.includes(b));
  } catch { return true; }
}

function passesUrlFilter(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (url.startsWith("data:image")) return false;
  if (isBlockedHost(url)) return false;
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg") || lower.endsWith(".gif")) return false;
  if (URL_BLACKLIST.some(w => lower.includes(w))) return false;
  // Accept only jpg/png/webp
  const ext = lower.split("?")[0].split(".").pop() || "";
  const validExts = ["jpg", "jpeg", "png", "webp", ""];
  if (ext && !validExts.includes(ext)) return false;
  return true;
}

function passesTitleFilter(title: string): boolean {
  const lower = title.toLowerCase();
  return !TITLE_REJECTION.some(t => lower.includes(t));
}

function passesSizeFilter(w?: number, h?: number): boolean {
  if (!w || !h) return true; // unknown size = allow through, will verify on download
  return w >= 400 && h >= 400;
}

function technicalFilter(item: SearchResult): boolean {
  if (!passesUrlFilter(item.imageUrl)) return false;
  if (!passesTitleFilter(item.title)) return false;
  if (!passesSizeFilter(item.width, item.height)) return false;
  return true;
}

/* ── Heuristic Scoring ── */
function extractProductAttributes(name: string) {
  const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tokens = lower.split(/[\s\-\/,;]+/).filter(Boolean);
  
  // Known brands in construction materials
  const BRANDS = ["liz", "votoran", "caue", "csn", "nassau", "itambe", "holcim", "votorantim",
    "quartzolit", "weber", "sika", "vedacit", "tigre", "amanco", "fortlev", "eternit",
    "brasilit", "tramontina", "dewalt", "bosch", "makita", "stanley", "vonder", "starrett",
    "eliane", "portobello", "portinari", "deca", "docol", "lorenzetti", "fame", "pial",
    "schneider", "weg", "intelbras", "irwin", "belgo", "gerdau", "arcelor"];
  
  const brand = tokens.find(t => BRANDS.includes(t)) || "";
  const model = tokens.filter(t => /[a-z]+\d|\d+[a-z]|cp\s*ii|cp\s*iii|cp\s*iv|cp\s*v/i.test(t)).join(" ");
  const weight = tokens.find(t => /^\d+\s*(kg|g|ml|l|m|mm|cm)$/i.test(t)) || "";
  
  return { brand, model, weight, tokens };
}

function calculateHeuristicScore(item: SearchResult, productName: string, category?: string): number {
  const { brand, model, weight, tokens } = extractProductAttributes(productName);
  const titleLower = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const urlLower = item.imageUrl.toLowerCase();
  
  let score = 0;
  const maxScore = 100;
  
  // Name token matches (up to 40 pts)
  const nameTokens = tokens.filter(t => t.length > 2);
  const matchedTokens = nameTokens.filter(t => titleLower.includes(t));
  if (nameTokens.length > 0) {
    score += (matchedTokens.length / nameTokens.length) * 40;
  }
  
  // Brand match (20 pts)
  if (brand && titleLower.includes(brand)) score += 20;
  
  // Model match (15 pts)
  if (model && titleLower.includes(model)) score += 15;
  
  // Category match (10 pts)
  if (category) {
    const catLower = category.toLowerCase();
    if (titleLower.includes(catLower)) score += 10;
  }
  
  // Weight/dimension match (5 pts)
  if (weight && titleLower.includes(weight)) score += 5;
  
  // Bonus: product-specific terms in title (5 pts)
  const productTerms = ["produto", "product", "embalagem", "saco", "pacote", "caixa", "lata", "galao", "balde"];
  if (productTerms.some(t => titleLower.includes(t))) score += 5;
  
  // Bonus: manufacturer/marketplace source (5 pts)
  const goodDomains = ["mercadolivre", "amazon", "leroymerlin", "telhanorte", "sodimac", "obramax"];
  if (goodDomains.some(d => urlLower.includes(d))) score += 5;
  
  return Math.min(maxScore, score) / maxScore; // normalize to 0-1
}

/* ── Search Engines ── */
function sourceScopedQuery(source: ImageSource, query: string) {
  const map: Record<string, string> = {
    mercado_livre: `${query} site:mercadolivre.com.br`,
    amazon: `${query} site:amazon.com.br`,
    shopee: `${query} site:shopee.com.br`,
    alibaba: `${query} site:alibaba.com`,
  };
  return map[source] || query;
}

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

async function searchDuckDuckGoImages(query: string, start: number, source: ImageSource): Promise<SearchResult[]> {
  const scopedQuery = sourceScopedQuery(source, query);
  const html = await fetchHtml(`https://duckduckgo.com/?q=${encodeURIComponent(scopedQuery)}&iax=images&ia=images`);
  if (!html) return [];

  const vqd = html.match(/vqd=['"]([^'"]+)['"]/i)?.[1] ?? html.match(/"vqd":"([^"]+)"/i)?.[1] ?? html.match(/vqd=([^&"']+)/i)?.[1] ?? "";
  if (!vqd) return [];

  const endpoint = new URL("https://duckduckgo.com/i.js");
  endpoint.searchParams.set("q", scopedQuery);
  endpoint.searchParams.set("l", "br-pt");
  endpoint.searchParams.set("o", "json");
  endpoint.searchParams.set("vqd", vqd);
  endpoint.searchParams.set("f", ",,,");
  endpoint.searchParams.set("p", "1");
  endpoint.searchParams.set("s", String(Math.max(0, start - 1)));

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
      source,
      width: parseNum(item?.width),
      height: parseNum(item?.height),
    }));
  } catch { return []; }
}

async function searchWithGoogleApi(query: string, start: number, apiKey?: string, cx?: string): Promise<SearchResult[]> {
  if (!apiKey || !cx) return [];
  const googleUrl = new URL("https://www.googleapis.com/customsearch/v1");
  googleUrl.searchParams.set("key", apiKey);
  googleUrl.searchParams.set("cx", cx);
  googleUrl.searchParams.set("q", query);
  googleUrl.searchParams.set("searchType", "image");
  googleUrl.searchParams.set("num", "10");
  googleUrl.searchParams.set("start", String(start));

  try {
    const resp = await fetch(googleUrl.toString());
    if (!resp.ok) return [];
    const payload = await resp.json();
    return (Array.isArray(payload?.items) ? payload.items : []).map((item: any, idx: number) => ({
      imageUrl: safeText(item?.link, 1200),
      thumbnail: safeText(item?.image?.thumbnailLink, 1200) || safeText(item?.link, 1200),
      title: safeText(item?.title, 160) || `Imagem ${idx + 1}`,
      source: "google" as ImageSource,
      width: parseNum(item?.image?.width),
      height: parseNum(item?.image?.height),
    }));
  } catch { return []; }
}

/* ── AI Validation (limited to top 3) ── */
async function validateWithAI(
  imageUrl: string,
  productName: string,
  category: string,
): Promise<{ confidence: number; analysis: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { confidence: 0.5, analysis: "AI key not configured" };

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você valida imagens de produtos de construção. Responda SOMENTE em JSON:
{"confidence": 0.0-1.0, "analysis": "explicação curta"}

Critérios:
- Produto real isolado ou em contexto adequado = alta confiança
- Marca/modelo visíveis e corretos = bônus
- Logo, banner, obra sem produto, loja genérica = confiança baixa
- Produto diferente do solicitado = confiança 0`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Produto: "${productName}"\nCategoria: "${category}"\nEsta imagem corresponde?` },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return { confidence: 0.5, analysis: "Rate limited" };
      if (response.status === 402) return { confidence: 0.5, analysis: "Credits exhausted" };
      return { confidence: 0.5, analysis: `AI error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
          analysis: parsed.analysis || "OK",
        };
      } catch { /* fall through */ }
    }
    return { confidence: 0.5, analysis: content.slice(0, 200) };
  } catch (err) {
    console.error("AI validation error:", err);
    return { confidence: 0.5, analysis: `Error: ${err}` };
  }
}

/* ── Pipeline: integrated search → filter → score → AI validate → save ── */
async function runPipeline(
  admin: any,
  productId: string,
  productName: string,
  category: string,
  autoApprove: boolean,
  maxImages: number,
  GOOGLE_API_KEY?: string,
  GOOGLE_CX?: string,
) {
  const log: string[] = [];
  const MAX_AI_CALLS = 3;
  let aiCallsUsed = 0;

  // Step 0: Check cache
  const cacheKey = `pipeline|${normalizeQuery(productName)}`;
  const { data: cacheRow } = await admin
    .from("search_cache")
    .select("images_json, created_at")
    .eq("query", cacheKey)
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let allCandidates: SearchResult[] = [];

  if (cacheRow?.images_json && Array.isArray(cacheRow.images_json) && cacheRow.images_json.length > 0) {
    allCandidates = cacheRow.images_json;
    log.push(`Cache hit: ${allCandidates.length} images`);
  } else {
    // Step 1: Multi-source search with smart queries
    const { brand, model, weight } = extractProductAttributes(productName);
    const queries = [
      productName, // full name
      brand ? `${productName} ${brand} embalagem` : `${productName} embalagem`,
      model ? `${brand} ${model} ${weight}`.trim() : "",
      // Usage-context queries for realistic review photos
      `${productName} instalado`,
      `${productName} obra aplicação`,
    ].filter(Boolean);

    log.push(`Queries: ${queries.join(" | ")}`);

    // Search in parallel across sources
    const searchPromises: Promise<SearchResult[]>[] = [];
    for (const q of queries.slice(0, 2)) {
      searchPromises.push(searchDuckDuckGoImages(q, 1, "bing"));
      if (GOOGLE_API_KEY && GOOGLE_CX) {
        searchPromises.push(searchWithGoogleApi(q, 1, GOOGLE_API_KEY, GOOGLE_CX));
      }
    }
    // Marketplace search
    searchPromises.push(searchDuckDuckGoImages(productName, 1, "mercado_livre"));

    const results = await Promise.allSettled(searchPromises);
    for (const r of results) {
      if (r.status === "fulfilled") allCandidates.push(...r.value);
    }

    // Deduplicate
    const seen = new Set<string>();
    allCandidates = allCandidates.filter(c => {
      if (seen.has(c.imageUrl)) return false;
      seen.add(c.imageUrl);
      return true;
    });

    log.push(`Raw candidates: ${allCandidates.length}`);

    // Cache results
    if (allCandidates.length > 0) {
      await admin.from("search_cache").upsert(
        { query: cacheKey, images_json: allCandidates, created_at: new Date().toISOString() },
        { onConflict: "query" },
      );
    }
  }

  // Step 2: Technical filtering
  const filtered = allCandidates.filter(technicalFilter);
  log.push(`After technical filter: ${filtered.length}`);

  // Step 3: Heuristic scoring
  const scored = filtered.map(item => ({
    ...item,
    heuristicScore: calculateHeuristicScore(item, productName, category),
  }));

  // Sort by heuristic score descending, pick top candidates for AI
  scored.sort((a, b) => (b.heuristicScore || 0) - (a.heuristicScore || 0));
  const topCandidates = scored.slice(0, Math.min(scored.length, MAX_AI_CALLS));
  log.push(`Top candidates for AI: ${topCandidates.length} (scores: ${topCandidates.map(c => c.heuristicScore?.toFixed(2)).join(", ")})`);

  // Step 4: AI validation (max 3 calls)
  const validated: Array<{
    item: SearchResult;
    confidence: number;
    analysis: string;
    status: "approved" | "review" | "rejected";
  }> = [];

  for (const candidate of topCandidates) {
    if (aiCallsUsed >= MAX_AI_CALLS) break;

    // Skip AI if heuristic is very low
    if ((candidate.heuristicScore || 0) < 0.15) {
      validated.push({ item: candidate, confidence: candidate.heuristicScore || 0, analysis: "Heuristic too low, skipped AI", status: "rejected" });
      continue;
    }

    aiCallsUsed++;
    const { confidence, analysis } = await validateWithAI(candidate.imageUrl, productName, category);

    let status: "approved" | "review" | "rejected";
    if (confidence > 0.8) status = "approved";
    else if (confidence >= 0.5) status = "review";
    else status = "rejected";

    validated.push({ item: candidate, confidence, analysis, status });

    // Save to review queue
    await admin.from("image_review_queue").upsert({
      product_id: productId,
      image_url: candidate.imageUrl,
      source: candidate.source,
      confidence,
      ai_analysis: analysis,
      status,
    }, { onConflict: "product_id,image_url", ignoreDuplicates: false }).catch(() => {
      // If upsert fails (no unique constraint), try insert
      return admin.from("image_review_queue").insert({
        product_id: productId,
        image_url: candidate.imageUrl,
        source: candidate.source,
        confidence,
        ai_analysis: analysis,
        status,
      });
    });
  }

  log.push(`AI validations: ${aiCallsUsed}, approved: ${validated.filter(v => v.status === "approved").length}`);

  // Step 5: Download and save approved images
  const approved = validated.filter(v => v.status === "approved" || (autoApprove && v.status === "review"));
  const saved: Array<{ path: string; public_url: string; sort_order: number; confidence: number }> = [];

  // Get current max sort_order
  const { data: maxSortRow } = await admin
    .from("store_product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sort = Number(maxSortRow?.sort_order ?? -1) + 1;

  for (const entry of approved.slice(0, maxImages)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const imgResp = await fetch(entry.item.imageUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      clearTimeout(timeout);

      if (!imgResp.ok) continue;
      const contentType = imgResp.headers.get("content-type");
      if (!contentType?.startsWith("image/")) continue;

      const bytes = new Uint8Array(await imgResp.arrayBuffer());
      if (bytes.byteLength < 2048) continue; // too small

      const ext = extFromContentType(contentType);
      const path = `imported/${productId.slice(0, 8)}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await admin.storage.from("product-images").upload(path, bytes, {
        contentType, upsert: false, cacheControl: "3600",
      });
      if (upErr) continue;

      const { error: insErr } = await admin.from("store_product_images").insert({
        product_id: productId, path, sort_order: sort,
      } as any);

      if (insErr) {
        await admin.storage.from("product-images").remove([path]);
        continue;
      }

      const { data: pub } = admin.storage.from("product-images").getPublicUrl(path);
      saved.push({ path, public_url: pub?.publicUrl ?? "", sort_order: sort, confidence: entry.confidence });
      sort++;
    } catch (e) {
      console.error("Download error:", e);
    }
  }

  log.push(`Saved: ${saved.length} images`);

  // Step 6: Fallback — if no images saved, try AI generation
  let aiFallbackUsed = false;
  if (saved.length === 0) {
    log.push("No images found, triggering AI generation fallback");
    aiFallbackUsed = true;
    // We don't call generate-product-images inline to keep this function focused
    // The caller can check saved.length === 0 and trigger generation separately
  }

  return {
    ok: true,
    product_id: productId,
    saved,
    ai_calls_used: aiCallsUsed,
    candidates_found: allCandidates.length,
    candidates_filtered: filtered.length,
    candidates_scored: topCandidates.length,
    validated: validated.map(v => ({
      url: v.item.imageUrl,
      heuristic: v.item.heuristicScore,
      confidence: v.confidence,
      status: v.status,
      analysis: v.analysis,
    })),
    fallback_needed: aiFallbackUsed,
    log,
  };
}

/* ── Main Handler ── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const GOOGLE_CX = Deno.env.get("GOOGLE_CX");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("backend_env_missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleOk } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!roleOk) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    /* ── GET: Legacy search endpoint (unchanged for backward compat) ── */
    if (req.method === "GET") {
      const url = new URL(req.url);
      const rawQuery = safeText(url.searchParams.get("q"), 160);
      const nq = normalizeQuery(rawQuery);
      const source = parseSource(url.searchParams.get("source"));
      const startRaw = Number(url.searchParams.get("start") ?? "1");
      const start = Number.isFinite(startRaw) ? Math.max(1, Math.min(91, Math.trunc(startRaw))) : 1;

      if (!nq || nq.length < 2) {
        return new Response(JSON.stringify({ error: "invalid_query" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Usage tracking
      const today = new Date().toISOString().slice(0, 10);
      const { data: usageRow } = await admin.from("search_image_usage")
        .select("id, searches_count").eq("user_id", userData.user.id).eq("usage_date", today).maybeSingle();

      if ((usageRow?.searches_count ?? 0) >= 5000) {
        return new Response(JSON.stringify({ error: "daily_limit_exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("search_image_usage").upsert(
        { user_id: userData.user.id, usage_date: today, searches_count: (usageRow?.searches_count ?? 0) + 1 },
        { onConflict: "user_id,usage_date" },
      );

      // Cache check
      const cacheKey = `v2|${source}|${start}|${nq}`;
      const { data: cacheRow } = await admin.from("search_cache")
        .select("images_json, created_at").eq("query", cacheKey)
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (cacheRow?.images_json && Array.isArray(cacheRow.images_json)) {
        return new Response(JSON.stringify({ images: cacheRow.images_json, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let images: SearchResult[] = await searchDuckDuckGoImages(rawQuery, start, source);
      if (images.length === 0 && source === "google") {
        images = await searchWithGoogleApi(rawQuery, start, GOOGLE_API_KEY, GOOGLE_CX);
      }
      if (images.length === 0 && source !== "bing") {
        images = await searchDuckDuckGoImages(rawQuery, start, "bing");
      }

      // Apply technical filter + heuristic score for display
      images = images.filter(technicalFilter).map(img => ({
        ...img,
        heuristicScore: calculateHeuristicScore(img, rawQuery),
      }));
      images.sort((a, b) => (b.heuristicScore || 0) - (a.heuristicScore || 0));
      images = images.slice(0, 40);

      if (images.length > 0) {
        await admin.from("search_cache").upsert(
          { query: cacheKey, images_json: images, created_at: new Date().toISOString() },
          { onConflict: "query" },
        );
      }

      return new Response(JSON.stringify({ images, cached: false, source: sourceLabel(source) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── POST ── */
    if (req.method === "POST") {
      const body = await req.json();

      /* ── Pipeline action: integrated search+filter+validate+save ── */
      if (body?.action === "pipeline") {
        const pb = body as PipelineBody;
        const productId = safeText(pb.productId, 64);
        if (!productId) {
          return new Response(JSON.stringify({ error: "productId_required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: product } = await admin.from("store_products")
          .select("id, name, category").eq("id", productId).maybeSingle();

        if (!product) {
          return new Response(JSON.stringify({ error: "product_not_found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = await runPipeline(
          admin, productId, product.name, product.category || "",
          pb.autoApprove ?? true,
          Math.min(pb.maxImages ?? 5, 5),
          GOOGLE_API_KEY, GOOGLE_CX,
        );

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      /* ── Legacy import action ── */
      if (body?.action === "import") {
        const ib = body as ImportBody;
        const productId = safeText(ib.productId, 64);
        const images = Array.isArray(ib.images) ? ib.images.slice(0, 40) : [];
        if (!productId || images.length === 0) {
          return new Response(JSON.stringify({ error: "invalid_payload" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: product } = await admin.from("store_products").select("id").eq("id", productId).maybeSingle();
        if (!product) {
          return new Response(JSON.stringify({ error: "product_not_found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: maxSortRow } = await admin.from("store_product_images")
          .select("sort_order").eq("product_id", productId)
          .order("sort_order", { ascending: false }).limit(1).maybeSingle();

        let sort = Number(maxSortRow?.sort_order ?? -1) + 1;
        const inserted: Array<{ path: string; public_url: string; sort_order: number }> = [];
        const usedUrls = new Set<string>();
        let failed = 0;

        for (const img of images) {
          const sourceUrl = safeText(img.imageUrl, 1200);
          if (!sourceUrl.startsWith("http")) { failed++; continue; }
          if (usedUrls.has(sourceUrl)) continue;
          usedUrls.add(sourceUrl);

          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);
            const response = await fetch(sourceUrl, {
              signal: controller.signal,
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            });
            clearTimeout(timeout);

            if (!response.ok) { failed++; continue; }
            const ct = response.headers.get("content-type");
            if (!ct?.startsWith("image/")) { failed++; continue; }

            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.byteLength < 1024) { failed++; continue; }

            const ext = extFromContentType(ct);
            const path = `imported/${productId.slice(0, 8)}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

            const { error: upErr } = await admin.storage.from("product-images").upload(path, bytes, {
              contentType: ct, upsert: false, cacheControl: "3600",
            });
            if (upErr) { failed++; continue; }

            const { error: insErr } = await admin.from("store_product_images").insert({
              product_id: productId, path, sort_order: sort,
            } as any);

            if (insErr) {
              failed++;
              await admin.storage.from("product-images").remove([path]);
              continue;
            }

            const { data: pub } = admin.storage.from("product-images").getPublicUrl(path);
            inserted.push({ path, public_url: pub.publicUrl, sort_order: sort });
            sort++;
          } catch { failed++; }
        }

        if (inserted.length === 0) {
          return new Response(JSON.stringify({ error: "no_valid_images", requested: images.length, failed }), {
            status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true, imported: inserted, requested: images.length, failed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "invalid_action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-product-images error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

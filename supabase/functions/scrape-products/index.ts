import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ──────────────────────────────────────────────
// 1. Brazilian price parsing (locale-aware)
// ──────────────────────────────────────────────
function parseLocalizedNumber(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;

  let cleaned = String(value).replace(/\s/g, "").replace(/[R$€]/g, "");
  // Remove unit suffixes
  cleaned = cleaned.replace(/\/m[²2]?/gi, "").replace(/\/un\.?/gi, "").replace(/\/cx\.?/gi, "");
  cleaned = cleaned.replace(/por\s*/gi, "").replace(/à vista.*/gi, "").trim();

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  if (lastDot === -1 && lastComma === -1) {
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  if (lastComma > lastDot) {
    // Brazilian: 7.222,00 → remove dots, comma→dot
    cleaned = cleaned.replace(/\./g, "");
    cleaned = cleaned.replace(",", ".");
  } else {
    // US/UK: 7,222.00 → remove commas
    cleaned = cleaned.replace(/,/g, "");
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

// ──────────────────────────────────────────────
// 2. Anti-absurd price validation by category
// ──────────────────────────────────────────────
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  argamassa: { min: 10, max: 200 },
  areia: { min: 50, max: 300 },
  tijolo: { min: 0.50, max: 5 },
  bloco: { min: 0.50, max: 15 },
  caixa_dagua: { min: 150, max: 4000 },
  anel_vedacao: { min: 1, max: 30 },
  cimento: { min: 15, max: 120 },
  tinta: { min: 20, max: 800 },
  telha: { min: 5, max: 200 },
  tubo: { min: 3, max: 500 },
  vergalhao: { min: 10, max: 300 },
};

function detectCategory(productName: string): string | null {
  const hay = productName.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (hay.includes("argamassa")) return "argamassa";
  if (hay.includes("areia")) return "areia";
  if (hay.includes("tijolo")) return "tijolo";
  if (hay.includes("bloco")) return "bloco";
  if (hay.includes("caixa") && hay.includes("agua")) return "caixa_dagua";
  if (hay.includes("anel") && hay.includes("vedac")) return "anel_vedacao";
  if (hay.includes("cimento")) return "cimento";
  if (hay.includes("tinta")) return "tinta";
  if (hay.includes("telha")) return "telha";
  if (hay.includes("tubo") || hay.includes("cano")) return "tubo";
  if (hay.includes("vergalhao") || hay.includes("vergalhão")) return "vergalhao";
  return null;
}

function validatePrice(price: number | null, productName: string): { valid: boolean; category: string | null } {
  if (price === null || price <= 0) return { valid: false, category: null };
  const cat = detectCategory(productName);
  if (!cat) return { valid: true, category: null };
  const range = PRICE_RANGES[cat];
  if (!range) return { valid: true, category: cat };
  return { valid: price >= range.min && price <= range.max, category: cat };
}

// ──────────────────────────────────────────────
// 3. Image validation
// ──────────────────────────────────────────────
const IMAGE_BLACKLIST_TERMS = ["logo", "icon", "sprite", "placeholder", "banner", "selo", "stamp", "badge"];

function isValidImageName(src: string): boolean {
  const lower = src.toLowerCase();
  return !IMAGE_BLACKLIST_TERMS.some(term => lower.includes(term));
}

// ──────────────────────────────────────────────
// Scraping logic
// ──────────────────────────────────────────────

function buildPageUrls(baseUrl: string, page: number): string[] {
  const variants: string[] = [];
  const u = new URL(baseUrl);

  const u1 = new URL(baseUrl);
  u1.searchParams.set("p", String(page));
  variants.push(u1.toString());

  const u2 = new URL(baseUrl);
  u2.searchParams.set("page", String(page));
  variants.push(u2.toString());

  const pathBase = u.pathname.replace(/\/page\/\d+\/?$/, "").replace(/\/$/, "");
  const u3 = new URL(baseUrl);
  u3.pathname = `${pathBase}/page/${page}`;
  u3.search = "";
  variants.push(u3.toString());

  return variants;
}

const CARD_SELECTORS = [
  ".item-product", "div.li .item-product", ".product-item-info", ".product-item",
  ".container-product", ".product-card", "[data-product]", ".product-grid-item",
  "article.product", ".shelf-item", ".vitrine-produto", ".card-product",
  "li.product", ".product", ".produto", ".products-grid .item",
  ".category-products .item", "ol.products li", "ul.products li",
  "ul.list-products > div.li",
];

const TITLE_SELECTORS = [
  "h2.title a", "h2.title", "a.product-item-link", ".product-item-link",
  ".product-title a", ".product-title", ".product-name a", ".product-name",
  ".produto-nome a", ".produto-nome", ".name a", ".name",
  "h2 a", "h3 a", "h2", "h3", "a[title]",
];

const PRICE_SELECTORS = [
  ".sale-price strong.total-m2", ".sale-price-pix-money span",
  ".sale-price strong", ".sale-price", ".price-final_price .price",
  ".price-box .price", ".special-price .price", ".price-final .price",
  ".price-new", ".price", ".product-price", ".preco", ".best-price",
  ".price__current", "[data-price-amount]", "span.price", ".valor",
];

const IMAGE_SELECTORS = [
  "img.product-image-photo", "img.product-image", ".product-image img",
  ".product-item-photo img", ".product-img img", "img[data-src]",
  ".product-thumb img", ".produto-imagem img", "img",
];

type ValidationError = "price_error" | "image_error" | "missing_image" | "parse_error";

interface ScrapedProduct {
  produto: string;
  url: string | null;
  preco: string | null;
  precoNum: number | null;
  pagina: number;
  dominio: string;
  imagemUrl: string | null;
  categoria: string | null;
  errors: ValidationError[];
}

function extractProducts(html: string, pageNum: number, origin: string, dominio: string): ScrapedProduct[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return [];

  let cards: any[] = [];
  for (const sel of CARD_SELECTORS) {
    try {
      const found = doc.querySelectorAll(sel);
      if (found && found.length > 0) { cards = Array.from(found); break; }
    } catch { /* skip */ }
  }

  // Fallback: product-like links
  if (cards.length === 0) {
    const allLinks = Array.from(doc.querySelectorAll("a[href]")) as any[];
    const seen = new Set<string>();
    for (const a of allLinks) {
      const href = a.getAttribute("href") || "";
      const text = (a.textContent || "").trim();
      if (
        text.length > 10 && !seen.has(text.toLowerCase()) &&
        (href.includes("/p") || href.includes("produto") || href.includes("product") || href.match(/\/[a-z0-9-]+$/))
      ) {
        seen.add(text.toLowerCase());
        const parent = a.parentElement;
        cards.push(parent || a);
      }
    }
  }

  const products: ScrapedProduct[] = [];

  for (const card of cards) {
    const errors: ValidationError[] = [];
    let bestTitle = "";

    for (const sel of TITLE_SELECTORS) {
      try {
        const el = card.querySelector(sel);
        if (el) {
          const txt = (el.textContent || "").trim();
          if (txt.length > bestTitle.length) bestTitle = txt;
          const titleAttr = el.getAttribute?.("title")?.trim() || "";
          if (titleAttr.length > bestTitle.length) bestTitle = titleAttr;
        }
      } catch { /* skip */ }
    }

    if (!bestTitle || bestTitle.length < 3) {
      try {
        const img = card.querySelector("img[alt]");
        if (img) {
          const alt = img.getAttribute("alt")?.trim() || "";
          if (alt.length > bestTitle.length) bestTitle = alt;
        }
      } catch { /* skip */ }
    }

    if (!bestTitle || bestTitle.length < 3) continue;

    // URL
    let productUrl: string | null = null;
    const link = card.tagName === "A" ? card : card.querySelector("a[href]");
    if (link) {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("http")) productUrl = href;
      else if (href.startsWith("/")) productUrl = new URL(href, origin).toString();
    }

    // Price (using locale-aware parser)
    let preco: string | null = null;
    let precoNum: number | null = null;
    for (const sel of PRICE_SELECTORS) {
      try {
        const el = card.querySelector(sel);
        if (el) {
          const raw = (el.textContent || "").trim().replace(/\s+/g, " ");
          if (raw && /\d/.test(raw)) {
            precoNum = parseLocalizedNumber(raw);
            preco = raw;
            break;
          }
        }
      } catch { /* skip */ }
    }

    if (!preco) {
      try {
        const priceEl = card.querySelector("[data-price-amount]");
        if (priceEl) {
          const amt = priceEl.getAttribute("data-price-amount");
          if (amt) {
            precoNum = parseFloat(amt);
            preco = `R$ ${precoNum.toFixed(2).replace(".", ",")}`;
          }
        }
      } catch { /* skip */ }
    }

    // Validate price
    const priceValidation = validatePrice(precoNum, bestTitle);
    if (precoNum !== null && !priceValidation.valid) {
      errors.push("price_error");
    }
    if (precoNum === null && preco) {
      errors.push("parse_error");
    }

    // Image extraction with validation
    let imagemUrl: string | null = null;
    for (const sel of IMAGE_SELECTORS) {
      try {
        const img = card.querySelector(sel);
        if (img) {
          const src = img.getAttribute("data-src") || img.getAttribute("src") || "";
          if (src && src.startsWith("http") && isValidImageName(src)) {
            imagemUrl = src;
            break;
          } else if (src && src.startsWith("/") && isValidImageName(src)) {
            imagemUrl = new URL(src, origin).toString();
            break;
          }
        }
      } catch { /* skip */ }
    }

    // Fallback: if image invalid, try other images in card
    if (!imagemUrl) {
      try {
        const allImgs = card.querySelectorAll("img");
        for (const img of Array.from(allImgs) as any[]) {
          const src = img.getAttribute("data-src") || img.getAttribute("src") || "";
          if (src && isValidImageName(src) && (src.startsWith("http") || src.startsWith("/"))) {
            imagemUrl = src.startsWith("http") ? src : new URL(src, origin).toString();
            break;
          }
        }
      } catch { /* skip */ }
    }

    if (!imagemUrl) {
      errors.push("missing_image");
    }

    products.push({
      produto: bestTitle,
      url: productUrl,
      preco,
      precoNum,
      pagina: pageNum,
      dominio,
      imagemUrl,
      categoria: priceValidation.category,
      errors,
    });
  }

  return products;
}

function detectNextPageUrl(html: string, origin: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return null;

  const nextSelectors = [
    "a.next", "a.next-page", ".pagination a.next",
    ".pages-item-next a", "a[rel='next']",
    ".pagination li.active + li a", "a.action.next",
    ".page-next a", ".pager .next a",
  ];

  for (const sel of nextSelectors) {
    try {
      const el = doc.querySelector(sel);
      if (el) {
        const href = el.getAttribute("href");
        if (href) {
          if (href.startsWith("http")) return href;
          if (href.startsWith("/")) return new URL(href, origin).toString();
        }
      }
    } catch { /* skip */ }
  }

  return null;
}

async function fetchPage(url: string, retries = 3): Promise<{ html: string | null; status: number | null; error: string | null }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        headers: {
          "User-Agent": randomUA(),
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "Referer": new URL(url).origin + "/",
        },
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        await res.text();
        await sleep(attempt * 3000);
        continue;
      }

      if (res.status === 403 || res.status === 503) {
        await res.text();
        if (attempt < retries) { await sleep(attempt * 2000); continue; }
        return { html: null, status: res.status, error: `HTTP ${res.status}` };
      }

      if (!res.ok) {
        await res.text();
        return { html: null, status: res.status, error: `HTTP ${res.status}` };
      }

      const html = await res.text();
      return { html, status: res.status, error: null };
    } catch (e: any) {
      if (attempt < retries) { await sleep(2000); continue; }
      return { html: null, status: null, error: e.message || "fetch failed" };
    }
  }
  return { html: null, status: null, error: "max retries" };
}

function productFingerprint(products: ScrapedProduct[]): string {
  return products.map(p => p.produto.toLowerCase().trim()).sort().join("|");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const baseUrl = (body.url || "").trim();

    if (!baseUrl || !baseUrl.startsWith("http")) {
      return new Response(
        JSON.stringify({ success: false, error: "URL obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawMax = Number(body.maxPages);
    const maxPages = rawMax > 0 ? Math.min(rawMax, 200) : 200;

    const origin = new URL(baseUrl).origin;
    const dominio = new URL(baseUrl).hostname.replace("www.", "");
    const logs: string[] = [];
    const errorLogs: Array<{ type: ValidationError; produto: string; detail: string }> = [];
    const allProducts: ScrapedProduct[] = [];
    const seenProductKeys = new Set<string>();
    let page = 1;
    let lastProductFingerprint = "";
    let consecutiveEmpty = 0;
    let paginationWorking: string | null = null;
    let detectedNextUrl: string | null = null;

    logs.push(`🌐 ${dominio} — ${baseUrl}`);

    while (page <= maxPages) {
      let urlsToTry: string[];

      if (page === 1) {
        urlsToTry = [baseUrl];
      } else if (detectedNextUrl) {
        urlsToTry = [detectedNextUrl, ...buildPageUrls(baseUrl, page)];
      } else if (paginationWorking) {
        urlsToTry = [paginationWorking.replace(/__PAGE__/g, String(page))];
      } else {
        urlsToTry = buildPageUrls(baseUrl, page);
      }

      let html: string | null = null;
      let fetchedUrl = "";

      for (const tryUrl of urlsToTry) {
        const result = await fetchPage(tryUrl);
        if (result.html && result.html.length > 500) {
          html = result.html;
          fetchedUrl = tryUrl;
          break;
        }
        if (page <= 2 && result.error) {
          logs.push(`⚠️ ${result.error} → ${tryUrl}`);
        }
      }

      if (!html) {
        logs.push(`⛔ ${dominio} P${page}: sem resposta`);
        break;
      }

      logs.push(`📥 ${dominio} P${page}: ${(html.length / 1024).toFixed(0)}KB`);

      const pageProducts = extractProducts(html, page, origin, dominio);

      const currentFingerprint = productFingerprint(pageProducts);
      if (page > 1 && currentFingerprint === lastProductFingerprint) {
        logs.push(`ℹ️ ${dominio} P${page}: mesmos produtos da página anterior — parando`);
        break;
      }
      if (pageProducts.length > 0) {
        lastProductFingerprint = currentFingerprint;
      }

      const newProducts: ScrapedProduct[] = [];
      for (const p of pageProducts) {
        const key = (p.produto + "|" + (p.url || "")).toLowerCase();
        if (!seenProductKeys.has(key)) {
          seenProductKeys.add(key);
          newProducts.push(p);

          // Collect detailed error logs
          for (const err of p.errors) {
            let detail = "";
            if (err === "price_error") detail = `Preço R$${p.precoNum} fora da faixa para ${p.categoria || "categoria"}`;
            else if (err === "missing_image") detail = "Nenhuma imagem válida encontrada";
            else if (err === "parse_error") detail = `Não foi possível converter: ${p.preco}`;
            else if (err === "image_error") detail = "Imagem inconsistente com o produto";
            errorLogs.push({ type: err, produto: p.produto, detail });
          }
        }
      }

      logs.push(`✅ ${dominio} → P${page}: ${pageProducts.length} encontrados, ${newProducts.length} novos`);

      // Log error counts per page
      const pageErrors = newProducts.reduce((sum, p) => sum + p.errors.length, 0);
      if (pageErrors > 0) {
        logs.push(`⚠️ P${page}: ${pageErrors} validação(ões) com problema`);
      }

      allProducts.push(...newProducts);

      if (pageProducts.length === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 2) {
          logs.push(`ℹ️ ${dominio} P${page}: sem produtos — parando`);
          break;
        }
      } else {
        consecutiveEmpty = 0;
        if (page >= 2 && !paginationWorking && fetchedUrl) {
          const pattern = fetchedUrl.replace(
            new RegExp(`([?&]p=|[?&]page=|/page/)${page}`, "i"),
            (match, prefix) => `${prefix}__PAGE__`
          );
          if (pattern.includes("__PAGE__")) {
            paginationWorking = pattern;
            logs.push(`🔗 Padrão de paginação: ${fetchedUrl.replace(String(page), "N")}`);
          }
        }
      }

      if (newProducts.length === 0 && pageProducts.length > 0 && page > 1) {
        logs.push(`ℹ️ ${dominio} P${page}: todos duplicados — parando`);
        break;
      }

      detectedNextUrl = detectNextPageUrl(html, origin);
      page++;
      if (page <= maxPages) await sleep(800);
    }

    // Summary stats
    const totalWithErrors = allProducts.filter(p => p.errors.length > 0).length;
    const priceErrors = errorLogs.filter(e => e.type === "price_error").length;
    const imageErrors = errorLogs.filter(e => e.type === "image_error").length;
    const missingImages = errorLogs.filter(e => e.type === "missing_image").length;
    const parseErrors = errorLogs.filter(e => e.type === "parse_error").length;

    logs.push(`📊 ${dominio}: ${allProducts.length} produtos em ${page - 1} páginas`);
    if (totalWithErrors > 0) {
      logs.push(`🔍 Validação: ${totalWithErrors} com erros (preço: ${priceErrors}, imagem: ${imageErrors + missingImages}, parse: ${parseErrors})`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalPages: page - 1,
        totalProducts: allProducts.length,
        products: allProducts,
        logs,
        errorLogs,
        dominio,
        validation: {
          totalWithErrors,
          priceErrors,
          imageErrors,
          missingImages,
          parseErrors,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

// -------- pagination: build candidate URLs for page N --------
function buildPageUrls(baseUrl: string, page: number): string[] {
  const variants: string[] = [];
  const u = new URL(baseUrl);

  // Magento / Convertiez ?p=N (priority for CNR)
  const u1 = new URL(baseUrl);
  u1.searchParams.set("p", String(page));
  variants.push(u1.toString());

  // Generic ?page=N
  const u2 = new URL(baseUrl);
  u2.searchParams.set("page", String(page));
  variants.push(u2.toString());

  // Path-based /page/N
  const pathBase = u.pathname.replace(/\/page\/\d+\/?$/, "").replace(/\/$/, "");
  const u3 = new URL(baseUrl);
  u3.pathname = `${pathBase}/page/${page}`;
  u3.search = "";
  variants.push(u3.toString());

  return variants;
}

// -------- selectors --------
const CARD_SELECTORS = [
  ".item-product",
  "div.li .item-product",
  ".product-item-info",
  ".product-item",
  ".container-product",
  ".product-card",
  "[data-product]",
  ".product-grid-item",
  "article.product",
  ".shelf-item",
  ".vitrine-produto",
  ".card-product",
  "li.product",
  ".product",
  ".produto",
  ".products-grid .item",
  ".category-products .item",
  "ol.products li",
  "ul.products li",
  "ul.list-products > div.li",
];

const TITLE_SELECTORS = [
  "h2.title a", "h2.title",
  "a.product-item-link", ".product-item-link",
  ".product-title a", ".product-title",
  ".product-name a", ".product-name",
  ".produto-nome a", ".produto-nome",
  ".name a", ".name",
  "h2 a", "h3 a", "h2", "h3",
  "a[title]",
];

const PRICE_SELECTORS = [
  ".sale-price strong.total-m2",
  ".sale-price-pix-money span",
  ".sale-price strong",
  ".sale-price",
  ".price-final_price .price",
  ".price-box .price",
  ".special-price .price",
  ".price-final .price",
  ".price-new", ".price", ".product-price",
  ".preco", ".best-price", ".price__current",
  "[data-price-amount]", "span.price", ".valor",
];

interface ScrapedProduct {
  produto: string;
  url: string | null;
  preco: string | null;
  precoNum: number | null;
  pagina: number;
  dominio: string;
}

function normalizePrice(raw: string): { display: string; num: number | null } {
  if (!raw) return { display: "", num: null };
  let cleaned = raw
    .replace(/R\$\s*/gi, "")
    .replace(/\/m[²2]?/gi, "")
    .replace(/\/un\.?/gi, "")
    .replace(/\/cx\.?/gi, "")
    .replace(/por\s*/gi, "")
    .replace(/à vista.*/gi, "")
    .trim();
  cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return { display: raw.trim(), num: isNaN(num) ? null : Math.round(num * 100) / 100 };
}

function extractProducts(html: string, pageNum: number, origin: string, dominio: string): ScrapedProduct[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return [];

  let cards: any[] = [];

  for (const sel of CARD_SELECTORS) {
    try {
      const found = doc.querySelectorAll(sel);
      if (found && found.length > 0) {
        cards = Array.from(found);
        break;
      }
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
        text.length > 10 &&
        !seen.has(text.toLowerCase()) &&
        (href.includes("/p") || href.includes("produto") || href.includes("product") || href.match(/\/[a-z0-9-]+$/))
      ) {
        seen.add(text.toLowerCase());
        const parent = a.parentElement;
        if (parent) cards.push(parent);
        else cards.push(a);
      }
    }
  }

  const products: ScrapedProduct[] = [];

  for (const card of cards) {
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

    // Price
    let preco: string | null = null;
    let precoNum: number | null = null;
    for (const sel of PRICE_SELECTORS) {
      try {
        const el = card.querySelector(sel);
        if (el) {
          const raw = (el.textContent || "").trim().replace(/\s+/g, " ");
          if (raw && /\d/.test(raw)) {
            const { display, num } = normalizePrice(raw);
            preco = display;
            precoNum = num;
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

    products.push({ produto: bestTitle, url: productUrl, preco, precoNum, pagina: pageNum, dominio });
  }

  return products;
}

// Detect next page link in HTML (for sites with non-standard pagination)
function detectNextPageUrl(html: string, origin: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return null;

  const nextSelectors = [
    "a.next", "a.next-page", ".pagination a.next",
    ".pages-item-next a", "a[rel='next']",
    ".pagination li.active + li a",
    "a.action.next",
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
        if (attempt < retries) {
          await sleep(attempt * 2000);
          continue;
        }
        return { html: null, status: res.status, error: `HTTP ${res.status}` };
      }

      if (!res.ok) {
        await res.text();
        return { html: null, status: res.status, error: `HTTP ${res.status}` };
      }

      const html = await res.text();
      return { html, status: res.status, error: null };
    } catch (e: any) {
      if (attempt < retries) {
        await sleep(2000);
        continue;
      }
      return { html: null, status: null, error: e.message || "fetch failed" };
    }
  }
  return { html: null, status: null, error: "max retries" };
}

// -------- main: processes a SINGLE URL with UNLIMITED pagination --------
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

    // maxPages=0 or absent means unlimited (safety cap at 200)
    const rawMax = Number(body.maxPages);
    const maxPages = rawMax > 0 ? Math.min(rawMax, 200) : 200;

    const origin = new URL(baseUrl).origin;
    const dominio = new URL(baseUrl).hostname.replace("www.", "");
    const logs: string[] = [];
    const allProducts: ScrapedProduct[] = [];
    const seenProductKeys = new Set<string>();
    let page = 1;
    let lastHtmlHash = "";
    let paginationMethod: "params" | "detected" | null = null;
    let detectedNextUrl: string | null = null;

    logs.push(`🌐 ${dominio} — ${baseUrl}`);

    while (page <= maxPages) {
      // Determine URL for this page
      let urlsToTry: string[];

      if (page === 1) {
        urlsToTry = [baseUrl];
      } else if (paginationMethod === "detected" && detectedNextUrl) {
        urlsToTry = [detectedNextUrl];
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
        if (page === 1 && result.error) {
          logs.push(`⚠️ ${result.error}`);
        }
      }

      if (!html) {
        logs.push(`⛔ ${dominio} P${page}: sem resposta`);
        break;
      }

      logs.push(`📥 ${dominio} P${page}: ${(html.length / 1024).toFixed(0)}KB`);

      // Hash-based duplicate detection (more reliable than substring)
      const htmlHash = simpleHash(html);
      if (page > 1 && htmlHash === lastHtmlHash) {
        logs.push(`ℹ️ ${dominio} P${page}: conteúdo duplicado — parando`);
        break;
      }
      lastHtmlHash = htmlHash;

      // Extract products
      const pageProducts = extractProducts(html, page, origin, dominio);

      // Deduplicate against all previously found products
      const newProducts: ScrapedProduct[] = [];
      for (const p of pageProducts) {
        const key = (p.produto + "|" + (p.url || "")).toLowerCase();
        if (!seenProductKeys.has(key)) {
          seenProductKeys.add(key);
          newProducts.push(p);
        }
      }

      logs.push(`✅ ${dominio} → P${page}: ${pageProducts.length} encontrados, ${newProducts.length} novos`);
      allProducts.push(...newProducts);

      // Stop conditions
      if (pageProducts.length === 0) {
        logs.push(`ℹ️ ${dominio} P${page}: sem produtos — parando`);
        break;
      }

      if (newProducts.length === 0 && page > 1) {
        logs.push(`ℹ️ ${dominio} P${page}: todos duplicados — parando`);
        break;
      }

      // Try to detect next page link
      detectedNextUrl = detectNextPageUrl(html, origin);
      if (detectedNextUrl && paginationMethod !== "detected") {
        paginationMethod = "detected";
        logs.push(`🔗 Paginação detectada via link`);
      }

      page++;
      if (page <= maxPages) await sleep(800);
    }

    logs.push(`📊 ${dominio}: ${allProducts.length} produtos em ${page - 1} páginas`);

    return new Response(
      JSON.stringify({
        success: true,
        totalPages: page - 1,
        totalProducts: allProducts.length,
        products: allProducts,
        logs,
        dominio,
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

// Simple string hash for duplicate detection
function simpleHash(str: string): string {
  let hash = 0;
  const sample = str.length > 5000 ? str.slice(0, 2500) + str.slice(-2500) : str;
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return String(hash);
}

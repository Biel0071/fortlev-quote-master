import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// -------- pagination --------
function buildPageUrls(baseUrl: string, page: number): string[] {
  const variants: string[] = [];
  const u = new URL(baseUrl);

  // Magento-style ?p=N (prioritized)
  const u1 = new URL(baseUrl);
  u1.searchParams.set("p", String(page));
  variants.push(u1.toString());

  // ?page=N
  const u2 = new URL(baseUrl);
  u2.searchParams.set("page", String(page));
  variants.push(u2.toString());

  // /page/N
  const pathBase = u.pathname.replace(/\/page\/\d+\/?$/, "").replace(/\/$/, "");
  const u3 = new URL(baseUrl);
  u3.pathname = `${pathBase}/page/${page}`;
  u3.search = "";
  variants.push(u3.toString());

  return variants;
}

// -------- selectors --------
const CARD_SELECTORS = [
  ".container-product",
  ".product-item-info",
  ".product-item",
  ".product-card",
  "[data-product]",
  ".product",
  ".produto",
  "li.product",
  ".card-product",
  ".shelf-item",
  ".vitrine-produto",
  ".product-grid-item",
  "article.product",
  ".products-grid .item",
  ".category-products .item",
  "ol.products li",
  "ul.products li",
];

const TITLE_SELECTORS = [
  "a.product-item-link",
  ".product-item-link",
  ".product-title",
  ".product-name a",
  ".product-name",
  ".produto-nome",
  ".name a",
  ".name",
  "h2 a",
  "h3 a",
  "h2",
  "h3",
  "a[title]",
];

const PRICE_SELECTORS = [
  ".price-final_price .price",
  ".price-box .price",
  ".special-price .price",
  ".price-final .price",
  ".price-new",
  ".price",
  ".product-price",
  ".preco",
  ".best-price",
  ".sale-price",
  ".price__current",
  "[data-price-amount]",
  "span.price",
  ".valor",
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
  // Remove "R$", "/m²", "un", etc.
  let cleaned = raw.replace(/R\$\s*/gi, "").replace(/\/[a-zA-Z²³]+/g, "").trim();
  // Handle Brazilian format: 1.234,56 → 1234.56
  cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return { display: raw.trim(), num: isNaN(num) ? null : Math.round(num * 100) / 100 };
}

function extractProducts(html: string, pageNum: number, origin: string, dominio: string): ScrapedProduct[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return [];

  let cards: any[] = [];
  let usedSelector = "";
  for (const sel of CARD_SELECTORS) {
    try {
      const found = doc.querySelectorAll(sel);
      if (found && found.length > 0) {
        cards = Array.from(found);
        usedSelector = sel;
        break;
      }
    } catch { /* skip */ }
  }

  // Fallback: find all links with product-like paths
  if (cards.length === 0) {
    const allLinks = Array.from(doc.querySelectorAll("a[href]"));
    const seen = new Set<string>();
    for (const a of allLinks as any[]) {
      const href = a.getAttribute("href") || "";
      const text = (a.textContent || "").trim();
      if (text.length > 10 && !seen.has(text.toLowerCase()) && (href.includes("/p/") || href.includes("produto") || href.includes("product") || href.length > 20)) {
        seen.add(text.toLowerCase());
        cards.push(a);
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
          // Also check title attribute
          const titleAttr = el.getAttribute?.("title")?.trim() || "";
          if (titleAttr.length > bestTitle.length) bestTitle = titleAttr;
        }
      } catch { /* skip */ }
    }
    // Check card itself if it's a link
    if (!bestTitle || bestTitle.length < 3) {
      const titleAttr = card.getAttribute?.("title")?.trim() || "";
      if (titleAttr.length > bestTitle.length) bestTitle = titleAttr;
      const cardText = (card.textContent || "").trim();
      if (cardText.length > 3 && cardText.length < 200 && bestTitle.length < 3) bestTitle = cardText.split("\n")[0].trim();
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
          if (raw) {
            const { display, num } = normalizePrice(raw);
            preco = display;
            precoNum = num;
            break;
          }
        }
      } catch { /* skip */ }
    }
    // Try data-price-amount attribute
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

function hasNextPage(html: string, currentPage: number): boolean {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return false;

  const nextSelectors = [
    'a[rel="next"]',
    ".pagination .next a",
    ".pagination li.active + li a",
    'a[aria-label="Next"]',
    'a[title="Próxima"]',
    'a[title="Next"]',
    ".pager .next a",
    ".pages .next",
    `a[href*="p=${currentPage + 1}"]`,
    `a[href*="page=${currentPage + 1}"]`,
  ];
  for (const sel of nextSelectors) {
    try {
      if (doc.querySelector(sel)) return true;
    } catch { /* skip */ }
  }
  return false;
}

async function fetchPage(url: string, logs: string[], page: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (res.status === 429) {
      logs.push(`⚠️ P${page}: 429 — retry em 5s...`);
      await sleep(5000);
      const retry = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        redirect: "follow",
      });
      if (retry.ok) return await retry.text();
      await retry.text();
      return null;
    }

    if (!res.ok) {
      await res.text();
      return null;
    }

    return await res.text();
  } catch (e) {
    logs.push(`❌ Erro: ${(e as Error).message}`);
    return null;
  }
}

async function scrapeUrl(baseUrl: string, maxPages: number, logs: string[]): Promise<{ products: ScrapedProduct[]; pagesScraped: number }> {
  const origin = new URL(baseUrl).origin;
  const dominio = new URL(baseUrl).hostname.replace("www.", "");
  const allProducts: ScrapedProduct[] = [];
  let page = 1;
  let lastHtml = "";
  const startTime = Date.now();

  logs.push(`🌐 Iniciando: ${dominio} — ${baseUrl}`);

  while (page <= maxPages) {
    const urls = page === 1 ? [baseUrl] : buildPageUrls(baseUrl, page);
    let html: string | null = null;
    let fetchedUrl = "";

    for (const tryUrl of urls) {
      html = await fetchPage(tryUrl, logs, page);
      if (html) {
        fetchedUrl = tryUrl;
        break;
      }
    }

    if (!html) {
      logs.push(`⛔ ${dominio} P${page}: sem resposta`);
      break;
    }

    // Detect duplicate page content
    if (page > 1 && html.length === lastHtml.length && html.slice(0, 500) === lastHtml.slice(0, 500)) {
      logs.push(`ℹ️ ${dominio} P${page}: conteúdo duplicado — parando`);
      break;
    }
    lastHtml = html;

    const products = extractProducts(html, page, origin, dominio);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logs.push(`✅ ${dominio} → P${page}: ${products.length} produtos (${elapsed}s) — ${fetchedUrl}`);
    allProducts.push(...products);

    if (products.length === 0 && page > 1) {
      logs.push(`ℹ️ ${dominio} P${page}: sem produtos — parando`);
      break;
    }

    // Even if no "next page" link is found, try next page for Magento sites
    if (page > 1 && products.length === 0) break;

    page++;
    if (page <= maxPages) await sleep(1200);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  logs.push(`📊 ${dominio}: ${allProducts.length} produtos em ${page - 1} páginas (${totalTime}s)`);

  return { products: allProducts, pagesScraped: page - 1 };
}

// -------- main handler --------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Support single url or array of urls
    let urls: string[] = [];
    if (body.urls && Array.isArray(body.urls)) {
      urls = body.urls.map((u: string) => u.trim()).filter(Boolean);
    } else if (body.url && typeof body.url === "string") {
      // Support multiline input
      urls = body.url.split(/[\n\r]+/).map((u: string) => u.trim()).filter((u: string) => u.startsWith("http"));
    }

    if (urls.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "URL(s) obrigatória(s)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxPages = Math.min(Math.max(1, Number(body.maxPages) || 10), 50);
    const logs: string[] = [];
    const allProducts: ScrapedProduct[] = [];
    let totalPages = 0;
    const queueResults: { url: string; status: string; pages: number; products: number }[] = [];

    logs.push(`📋 Fila: ${urls.length} URL(s) para processar`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      logs.push(`\n🔄 [${i + 1}/${urls.length}] Processando...`);

      try {
        const { products, pagesScraped } = await scrapeUrl(url, maxPages, logs);
        allProducts.push(...products);
        totalPages += pagesScraped;
        queueResults.push({ url, status: "done", pages: pagesScraped, products: products.length });
      } catch (e) {
        logs.push(`❌ Erro em ${url}: ${(e as Error).message}`);
        queueResults.push({ url, status: "failed", pages: 0, products: 0 });
      }

      // Rate limit between URLs
      if (i < urls.length - 1) await sleep(2000);
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const unique = allProducts.filter((p) => {
      const key = p.produto.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    logs.push(`\n🏁 Concluído: ${unique.length} produtos únicos de ${totalPages} páginas em ${urls.length} URLs`);

    return new Response(
      JSON.stringify({
        success: true,
        totalUrls: urls.length,
        totalPages,
        totalProducts: unique.length,
        products: unique,
        queue: queueResults,
        logs,
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

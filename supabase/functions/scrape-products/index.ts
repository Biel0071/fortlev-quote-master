import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate-limit: 1 req/sec
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// -------- pagination helpers --------
function buildPageUrl(baseUrl: string, page: number): string[] {
  const u = new URL(baseUrl);
  const variants: string[] = [];

  // ?page=N
  const u1 = new URL(baseUrl);
  u1.searchParams.set("page", String(page));
  variants.push(u1.toString());

  // ?p=N
  const u2 = new URL(baseUrl);
  u2.searchParams.set("p", String(page));
  variants.push(u2.toString());

  // /page/N
  const pathBase = u.pathname.replace(/\/page\/\d+\/?$/, "").replace(/\/$/, "");
  const u3 = new URL(baseUrl);
  u3.pathname = `${pathBase}/page/${page}`;
  u3.search = "";
  variants.push(u3.toString());

  return variants;
}

// -------- product extraction --------
const CARD_SELECTORS = [
  ".product-card",
  ".product-item",
  "[data-product]",
  ".product",
  ".produto",
  "li.product",
  ".card-product",
  ".shelf-item",
  ".vitrine-produto",
  ".product-grid-item",
  "article.product",
];

const TITLE_SELECTORS = [
  ".product-title",
  ".product-item-link",
  ".product-name",
  ".produto-nome",
  ".name",
  "h2 a",
  "h3 a",
  "h2",
  "h3",
  "a[title]",
];

const PRICE_SELECTORS = [
  ".price",
  ".product-price",
  ".preco",
  ".best-price",
  ".sale-price",
  ".price__current",
  "[data-price]",
  "span.price",
  ".valor",
];

interface ScrapedProduct {
  produto: string;
  url: string | null;
  preco: string | null;
  pagina: number;
}

function extractProducts(html: string, pageNum: number, origin: string): ScrapedProduct[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return [];

  // Find the best card selector
  let cards: any[] = [];
  for (const sel of CARD_SELECTORS) {
    const found = doc.querySelectorAll(sel);
    if (found && found.length > 0) {
      cards = Array.from(found);
      break;
    }
  }

  // Fallback: try any element containing links with product-like paths
  if (cards.length === 0) {
    const allLinks = Array.from(doc.querySelectorAll('a[href*="produto"], a[href*="product"], a[href*="/p/"]'));
    // Group by closest parent li / div
    const seen = new Set<string>();
    for (const a of allLinks) {
      const parent = (a as any).parentElement;
      if (parent && !seen.has(parent.innerHTML?.slice(0, 60))) {
        seen.add(parent.innerHTML?.slice(0, 60));
        cards.push(parent);
      }
    }
  }

  const products: ScrapedProduct[] = [];

  for (const card of cards) {
    // Title
    let bestTitle = "";
    for (const sel of TITLE_SELECTORS) {
      const el = card.querySelector(sel);
      if (el) {
        const txt = (el.textContent || "").trim();
        if (txt.length > bestTitle.length) bestTitle = txt;
      }
    }
    // Also check title attr
    const titleAttr = card.querySelector("a[title]");
    if (titleAttr) {
      const t = titleAttr.getAttribute("title")?.trim() || "";
      if (t.length > bestTitle.length) bestTitle = t;
    }

    if (!bestTitle || bestTitle.length < 3) continue;

    // URL
    let productUrl: string | null = null;
    const link = card.querySelector("a[href]");
    if (link) {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("http")) productUrl = href;
      else if (href.startsWith("/")) productUrl = new URL(href, origin).toString();
    }

    // Price
    let preco: string | null = null;
    for (const sel of PRICE_SELECTORS) {
      const el = card.querySelector(sel);
      if (el) {
        preco = (el.textContent || "").trim().replace(/\s+/g, " ");
        if (preco) break;
      }
    }

    products.push({ produto: bestTitle, url: productUrl, preco, pagina: pageNum });
  }

  return products;
}

function hasNextPage(html: string, currentPage: number): boolean {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return false;

  // Common pagination selectors
  const nextSelectors = [
    'a[rel="next"]',
    ".pagination .next a",
    ".pagination li.active + li a",
    'a[aria-label="Next"]',
    'a[title="Próxima"]',
    ".pager .next a",
    `a[href*="page=${currentPage + 1}"]`,
    `a[href*="p=${currentPage + 1}"]`,
  ];
  for (const sel of nextSelectors) {
    try {
      if (doc.querySelector(sel)) return true;
    } catch { /* selector might fail */ }
  }
  return false;
}

// -------- main handler --------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, maxPages = 10 } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ success: false, error: "URL obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = Math.min(Math.max(1, Number(maxPages) || 10), 50);
    const baseUrl = url.trim();
    const origin = new URL(baseUrl).origin;

    const allProducts: ScrapedProduct[] = [];
    const logs: string[] = [];
    let page = 1;
    let lastHtml = "";

    while (page <= limit) {
      const urls = page === 1 ? [baseUrl] : buildPageUrl(baseUrl, page);
      let html = "";
      let fetchedUrl = "";
      let fetched = false;

      for (const tryUrl of urls) {
        try {
          const res = await fetch(tryUrl, {
            headers: {
              "User-Agent": USER_AGENT,
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
            redirect: "follow",
          });

          if (res.status === 429) {
            logs.push(`⚠️ Página ${page}: bloqueio 429 — aguardando retry...`);
            await sleep(5000);
            const retry = await fetch(tryUrl, {
              headers: { "User-Agent": USER_AGENT },
              redirect: "follow",
            });
            if (retry.ok) {
              html = await retry.text();
              fetchedUrl = tryUrl;
              fetched = true;
              break;
            }
            logs.push(`❌ Página ${page}: bloqueio mantido após retry`);
            continue;
          }

          if (!res.ok) {
            await res.text(); // consume body
            continue;
          }

          html = await res.text();
          fetchedUrl = tryUrl;
          fetched = true;
          break;
        } catch (e) {
          logs.push(`❌ Página ${page}: erro ao acessar ${tryUrl} — ${(e as Error).message}`);
        }
      }

      if (!fetched || !html) {
        logs.push(`⛔ Página ${page}: nenhuma variante de URL funcionou`);
        break;
      }

      // Detect if page is identical to the last (some sites return page 1 for invalid pages)
      if (page > 1 && html.length === lastHtml.length && html.slice(0, 500) === lastHtml.slice(0, 500)) {
        logs.push(`ℹ️ Página ${page}: conteúdo idêntico à anterior — parando`);
        break;
      }
      lastHtml = html;

      const products = extractProducts(html, page, origin);
      logs.push(`✅ Página ${page}: ${products.length} produtos encontrados — ${fetchedUrl}`);
      allProducts.push(...products);

      if (products.length === 0 && page > 1) {
        logs.push(`ℹ️ Página ${page}: sem produtos — parando`);
        break;
      }

      if (!hasNextPage(html, page) && page > 1) {
        logs.push(`ℹ️ Sem link de próxima página após página ${page}`);
        break;
      }

      page++;
      if (page <= limit) await sleep(1200); // rate limit
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const unique = allProducts.filter((p) => {
      const key = p.produto.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalPages: page - 1,
        totalProducts: unique.length,
        products: unique,
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

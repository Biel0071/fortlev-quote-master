import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ImageSource = "bing" | "google" | "mercado_livre" | "amazon" | "shopee" | "alibaba";

type SearchResult = {
  imageUrl: string;
  thumbnail: string;
  title: string;
  source: ImageSource;
  width?: number;
  height?: number;
};

type ImportBody = {
  action: "import";
  productId: string;
  images: SearchResult[];
};

function normalizeQuery(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function safeText(input: unknown, max = 300) {
  return String(input ?? "").trim().slice(0, max);
}

function extFromContentType(contentType: string | null) {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
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
  switch (source) {
    case "google":
      return "Google Images";
    case "mercado_livre":
      return "Mercado Livre";
    case "amazon":
      return "Amazon";
    case "shopee":
      return "Shopee";
    case "alibaba":
      return "Alibaba";
    default:
      return "Bing Images";
  }
}

function decodeEscaped(value: string) {
  return value
    .replace(/\\u002f/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ");
}

function normalizeUrl(raw: string, baseUrl: string) {
  const cleaned = decodeEscaped(raw.trim());
  if (!cleaned) return "";

  if (cleaned.startsWith("//")) return `https:${cleaned}`;

  try {
    return new URL(cleaned, baseUrl).toString();
  } catch {
    return "";
  }
}

function parseNum(raw?: string) {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.trunc(n);
}

function isLikelyRealImage(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (url.includes("data:image")) return false;
  if (url.includes("sprite") || url.includes("logo") || url.includes("icon")) return false;
  return true;
}

function filterCandidate(item: SearchResult) {
  if (!isLikelyRealImage(item.imageUrl)) return false;

  if (item.width && item.height) {
    if (item.width < 300 || item.height < 300) return false;
  }

  return true;
}

function extractFromBingMarkup(html: string, source: ImageSource): SearchResult[] {
  const out: SearchResult[] = [];
  const regex = /"murl":"([^"]+?)"[\s\S]*?"turl":"([^"]+?)"[\s\S]*?"t":"([^"]*?)"/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const imageUrl = normalizeUrl(match[1], "https://www.bing.com");
    const thumbnail = normalizeUrl(match[2], "https://www.bing.com") || imageUrl;
    const title = safeText(decodeEscaped(match[3]), 160) || `Imagem ${out.length + 1}`;

    if (!imageUrl) continue;

    out.push({
      imageUrl,
      thumbnail,
      title,
      source,
    });

    if (out.length >= 60) break;
  }

  return out;
}

function extractFromImgTags(html: string, baseUrl: string, source: ImageSource): SearchResult[] {
  const out: SearchResult[] = [];
  const imgTagRegex = /<img\b[^>]*>/gi;

  const srcRegex = /(?:data-src|data-image|src)=["']([^"']+)["']/i;
  const srcSetRegex = /srcset=["']([^"']+)["']/i;
  const altRegex = /alt=["']([^"']*)["']/i;
  const widthRegex = /width=["'](\d+)["']/i;
  const heightRegex = /height=["'](\d+)["']/i;

  const tags = html.match(imgTagRegex) ?? [];
  for (const tag of tags) {
    const srcMatch = tag.match(srcRegex);
    const srcSetMatch = tag.match(srcSetRegex);

    let rawUrl = srcMatch?.[1] ?? "";
    if (!rawUrl && srcSetMatch?.[1]) {
      rawUrl = srcSetMatch[1].split(",")[0]?.trim().split(" ")[0] ?? "";
    }

    const imageUrl = normalizeUrl(rawUrl, baseUrl);
    if (!imageUrl) continue;

    out.push({
      imageUrl,
      thumbnail: imageUrl,
      title: safeText(decodeEscaped(altRegex.exec(tag)?.[1] ?? ""), 160) || `Imagem ${out.length + 1}`,
      source,
      width: parseNum(widthRegex.exec(tag)?.[1]),
      height: parseNum(heightRegex.exec(tag)?.[1]),
    });

    if (out.length >= 120) break;
  }

  return out;
}

function dedupeAndLimit(items: SearchResult[], limit = 40): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];

  for (const item of items) {
    const key = item.imageUrl;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!filterCandidate(item)) continue;

    out.push(item);
    if (out.length >= limit) break;
  }

  return out;
}

function buildSearchUrl(source: ImageSource, query: string, start: number) {
  const encoded = encodeURIComponent(query);
  const hyphen = query.trim().replace(/\s+/g, "-");

  switch (source) {
    case "google":
      return `https://www.google.com/search?tbm=isch&q=${encoded}&start=${start}`;
    case "mercado_livre":
      return `https://lista.mercadolivre.com.br/${encodeURIComponent(hyphen)}`;
    case "amazon":
      return `https://www.amazon.com.br/s?k=${encoded}`;
    case "shopee":
      return `https://shopee.com.br/search?keyword=${encoded}`;
    case "alibaba":
      return `https://www.alibaba.com/trade/search?SearchText=${encoded}`;
    default:
      return `https://www.bing.com/images/search?q=${encoded}&first=${start}`;
  }
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return { ok: false, html: "", status: response.status };
    }

    const html = await response.text();
    return { ok: true, html, status: response.status };
  } catch {
    return { ok: false, html: "", status: 0 };
  } finally {
    clearTimeout(timeout);
  }
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

  const googleResp = await fetch(googleUrl.toString(), { method: "GET" });
  if (!googleResp.ok) {
    const text = await googleResp.text();
    console.error("google_api_search_error", googleResp.status, text);
    return [];
  }

  const payload = await googleResp.json();
  const items: SearchResult[] = Array.isArray(payload?.items)
    ? payload.items.map((item: any) => ({
        imageUrl: safeText(item?.link, 1200),
        thumbnail: safeText(item?.image?.thumbnailLink, 1200) || safeText(item?.link, 1200),
        title: safeText(item?.title, 160),
        source: "google",
        width: parseNum(String(item?.image?.width ?? "")),
        height: parseNum(String(item?.image?.height ?? "")),
      }))
    : [];

  return dedupeAndLimit(items, 40);
}

async function scrapeSource(source: ImageSource, query: string, start: number): Promise<SearchResult[]> {
  const url = buildSearchUrl(source, query, start);
  const page = await fetchHtml(url);
  if (!page.ok || !page.html) return [];

  const fromBing = source === "bing" ? extractFromBingMarkup(page.html, source) : [];
  const fromTags = extractFromImgTags(page.html, url, source);

  return dedupeAndLimit([...fromBing, ...fromTags], 40);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const GOOGLE_CX = Deno.env.get("GOOGLE_CX");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("backend_env_missing");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.error("auth_error", userErr?.message ?? "no user");
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleOk, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    if (roleErr || !roleOk) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (req.method === "GET") {
      const url = new URL(req.url);
      const rawQuery = safeText(url.searchParams.get("q"), 160);
      const normalizedQuery = normalizeQuery(rawQuery);
      const source = parseSource(url.searchParams.get("source"));
      const startRaw = Number(url.searchParams.get("start") ?? "1");
      const start = Number.isFinite(startRaw) ? Math.max(1, Math.min(91, Math.trunc(startRaw))) : 1;

      if (!normalizedQuery || normalizedQuery.length < 2) {
        return new Response(JSON.stringify({ error: "invalid_query" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().slice(0, 10);
      const { data: usageRow } = await admin
        .from("search_image_usage")
        .select("id, searches_count")
        .eq("user_id", userData.user.id)
        .eq("usage_date", today)
        .maybeSingle();

      if ((usageRow?.searches_count ?? 0) >= 40) {
        return new Response(JSON.stringify({ error: "daily_limit_exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: usageErr } = await admin
        .from("search_image_usage")
        .upsert(
          {
            user_id: userData.user.id,
            usage_date: today,
            searches_count: (usageRow?.searches_count ?? 0) + 1,
          },
          { onConflict: "user_id,usage_date" },
        );

      if (usageErr) throw usageErr;

      const cacheKey = `${source}|${start}|${normalizedQuery}`;

      const { data: cacheRow } = await admin
        .from("search_cache")
        .select("images_json, created_at")
        .eq("query", cacheKey)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheRow?.images_json && Array.isArray(cacheRow.images_json)) {
        return new Response(JSON.stringify({ images: cacheRow.images_json, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let images: SearchResult[] = [];

      if (source === "google") {
        images = await searchWithGoogleApi(rawQuery, start, GOOGLE_API_KEY, GOOGLE_CX);
      }

      if (images.length === 0) {
        images = await scrapeSource(source, rawQuery, start);
      }

      if (images.length === 0 && source !== "bing") {
        images = await scrapeSource("bing", rawQuery, start);
      }

      if (images.length === 0) {
        console.error("search_empty", { source, query: rawQuery });
        return new Response(JSON.stringify({ error: "no_images_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("search_cache").upsert(
        {
          query: cacheKey,
          images_json: images,
          created_at: new Date().toISOString(),
        },
        { onConflict: "query" },
      );

      return new Response(
        JSON.stringify({
          images,
          cached: false,
          source: sourceLabel(source),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (req.method === "POST") {
      const body = (await req.json()) as ImportBody;
      if (body?.action !== "import") {
        return new Response(JSON.stringify({ error: "invalid_action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productId = safeText(body.productId, 64);
      const images = Array.isArray(body.images) ? body.images.slice(0, 10) : [];
      if (!productId || images.length === 0) {
        return new Response(JSON.stringify({ error: "invalid_payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: product } = await admin.from("store_products").select("id").eq("id", productId).maybeSingle();
      if (!product) {
        return new Response(JSON.stringify({ error: "product_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: maxSortRow } = await admin
        .from("store_product_images")
        .select("sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      let sort = Number(maxSortRow?.sort_order ?? -1) + 1;
      const inserted: Array<{ path: string; public_url: string; sort_order: number }> = [];
      const usedUrls = new Set<string>();

      for (const img of images) {
        const sourceUrl = safeText(img.imageUrl, 1200);
        if (!sourceUrl.startsWith("http://") && !sourceUrl.startsWith("https://")) continue;
        if (usedUrls.has(sourceUrl)) continue;
        usedUrls.add(sourceUrl);

        const downloadResp = await fetch(sourceUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          },
        });

        if (!downloadResp.ok) continue;

        const contentType = downloadResp.headers.get("content-type");
        if (!contentType || !contentType.startsWith("image/")) continue;

        const bytes = new Uint8Array(await downloadResp.arrayBuffer());
        if (bytes.byteLength < 1024) continue;

        const ext = extFromContentType(contentType);
        const safeProduct = productId.slice(0, 8);
        const path = `imported/${safeProduct}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadErr } = await admin.storage.from("product-images").upload(path, bytes, {
          contentType,
          upsert: false,
          cacheControl: "3600",
        });
        if (uploadErr) continue;

        const { error: insertErr } = await admin.from("store_product_images").insert({
          product_id: productId,
          path,
          sort_order: sort,
        } as any);

        if (insertErr) continue;

        const { data: publicData } = admin.storage.from("product-images").getPublicUrl(path);
        inserted.push({ path, public_url: publicData.publicUrl, sort_order: sort });
        sort += 1;
      }

      if (inserted.length === 0) {
        return new Response(JSON.stringify({ error: "no_valid_images" }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true, imported: inserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-product-images error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SearchResult = {
  imageUrl: string;
  thumbnail: string;
  title: string;
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
  return "jpg";
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
      if (!GOOGLE_API_KEY || !GOOGLE_CX) {
        return new Response(JSON.stringify({ error: "google_credentials_missing" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = new URL(req.url);
      const rawQuery = safeText(url.searchParams.get("q"), 160);
      const normalizedQuery = normalizeQuery(rawQuery);
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

      if ((usageRow?.searches_count ?? 0) >= 10) {
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

      const { data: cacheRow } = await admin
        .from("search_cache")
        .select("images_json, created_at")
        .eq("query", normalizedQuery)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheRow?.images_json && Array.isArray(cacheRow.images_json)) {
        return new Response(JSON.stringify({ images: cacheRow.images_json, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const googleUrl = new URL("https://www.googleapis.com/customsearch/v1");
      googleUrl.searchParams.set("key", GOOGLE_API_KEY);
      googleUrl.searchParams.set("cx", GOOGLE_CX);
      googleUrl.searchParams.set("q", rawQuery);
      googleUrl.searchParams.set("searchType", "image");
      googleUrl.searchParams.set("num", "10");
      googleUrl.searchParams.set("start", String(start));

      const googleResp = await fetch(googleUrl.toString(), { method: "GET" });
      if (!googleResp.ok) {
        const text = await googleResp.text();
        console.error("google_search_error", googleResp.status, text);
        return new Response(JSON.stringify({ error: "google_search_failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = await googleResp.json();
      const images: SearchResult[] = Array.isArray(payload?.items)
        ? payload.items
            .map((item: any) => ({
              imageUrl: safeText(item?.link, 1000),
              thumbnail: safeText(item?.image?.thumbnailLink, 1000),
              title: safeText(item?.title, 200),
            }))
            .filter((item: SearchResult) => item.imageUrl.startsWith("http"))
            .slice(0, 10)
        : [];

      await admin.from("search_cache").upsert(
        {
          query: normalizedQuery,
          images_json: images,
          created_at: new Date().toISOString(),
        },
        { onConflict: "query" },
      );

      return new Response(JSON.stringify({ images, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

      for (const img of images) {
        const sourceUrl = safeText(img.imageUrl, 1200);
        if (!sourceUrl.startsWith("http://") && !sourceUrl.startsWith("https://")) continue;

        const downloadResp = await fetch(sourceUrl);
        if (!downloadResp.ok) continue;

        const contentType = downloadResp.headers.get("content-type");
        if (!contentType || !contentType.startsWith("image/")) continue;

        const bytes = new Uint8Array(await downloadResp.arrayBuffer());
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

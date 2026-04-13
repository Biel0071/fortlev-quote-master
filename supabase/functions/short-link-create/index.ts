import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateBody = {
  token?: string;
  store_id?: string;
  original_url?: string;
  slug?: string;
  title?: string;
};

const sanitizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const randomSlug = () => Math.random().toString(36).slice(2, 9);

const hashToken = async (raw: string) => {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "server_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CreateBody;
    const token = String(body.token ?? "").trim();
    const storeId = String(body.store_id ?? "").trim();
    const originalUrl = String(body.original_url ?? "").trim();
    const title = String(body.title ?? "").trim() || null;

    if (!token || token.length < 16) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!storeId) {
      return new Response(JSON.stringify({ error: "missing_store_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(originalUrl);
    } catch {
      return new Response(JSON.stringify({ error: "invalid_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return new Response(JSON.stringify({ error: "invalid_url_protocol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloud = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const tokenHash = await hashToken(token);

    const { data: tokenRow } = await cloud
      .from("app_shortener_tokens")
      .select("id")
      .eq("store_id", storeId)
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle();

    if (!tokenRow) {
      return new Response(JSON.stringify({ error: "unauthorized_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedSlug = sanitizeSlug(String(body.slug ?? ""));
    let slug = requestedSlug || randomSlug();
    let created: { id: string; slug: string } | null = null;

    for (let i = 0; i < 4; i += 1) {
      const { data, error } = await cloud
        .from("app_short_links")
        .insert({
          store_id: storeId,
          slug,
          original_url: originalUrl,
          title,
          created_via: "script",
          active: true,
        })
        .select("id, slug")
        .single();

      if (!error && data) {
        created = data;
        break;
      }

      if (error?.code === "23505") {
        if (requestedSlug) {
          return new Response(JSON.stringify({ error: "slug_already_exists" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        slug = randomSlug();
        continue;
      }

      throw error;
    }

    if (!created) {
      return new Response(JSON.stringify({ error: "failed_to_create_short_link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await cloud
      .from("app_shortener_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    return new Response(
      JSON.stringify({
        id: created.id,
        slug: created.slug,
        short_url: `${origin}/r/${created.slug}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[short-link-create]", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
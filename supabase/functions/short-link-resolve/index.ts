import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
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

    const url = new URL(req.url);
    const slug = String(url.searchParams.get("slug") ?? "").trim().toLowerCase();
    if (!slug) {
      return new Response(JSON.stringify({ error: "missing_slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloud = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: row } = await cloud
      .from("app_short_links")
      .select("id, original_url, active, expires_at, clicks")
      .eq("slug", slug)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!row.active) {
      return new Response(JSON.stringify({ error: "inactive_link" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ error: "expired_link" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await cloud
      .from("app_short_links")
      .update({
        clicks: Number(row.clicks ?? 0) + 1,
        last_clicked_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return new Response(JSON.stringify({ destination_url: row.original_url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[short-link-resolve]", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
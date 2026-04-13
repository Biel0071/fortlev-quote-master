import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
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
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const slug = String((body as any).slug ?? url.searchParams.get("slug") ?? "").trim().toLowerCase();
    const utmSource = String((body as any).utm_source ?? "").trim() || null;
    const utmCampaign = String((body as any).utm_campaign ?? "").trim() || null;
    const sessionTokenInput = String((body as any).session_token ?? "").trim();
    const referrer = String((body as any).referrer ?? req.headers.get("referer") ?? "").trim() || null;
    const accessPath = String((body as any).path ?? `/r/${slug}`).trim() || `/r/${slug}`;

    if (!slug) {
      return new Response(JSON.stringify({ error: "missing_slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloud = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const randomSessionToken =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const sessionToken = sessionTokenInput.length >= 8 ? sessionTokenInput : randomSessionToken;

    const getIp = () => {
      const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const real = req.headers.get("x-real-ip")?.trim();
      return forwarded || real || null;
    };

    const hashText = async (raw: string) => {
      const data = new TextEncoder().encode(raw);
      const digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    };

    const parseDevice = (ua: string) => {
      const low = ua.toLowerCase();
      const device = /mobile|android|iphone|ipad/.test(low) ? "mobile" : "desktop";
      let browser = "other";
      if (low.includes("edg/")) browser = "edge";
      else if (low.includes("chrome/")) browser = "chrome";
      else if (low.includes("safari/") && !low.includes("chrome/")) browser = "safari";
      else if (low.includes("firefox/")) browser = "firefox";
      return { device, browser };
    };

    const { data: row } = await cloud
      .from("app_short_links")
      .select("id, store_id, original_url, active, expires_at, clicks, link_type, campaign_origin, token_id")
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

    const ip = getIp();
    const ipHash = ip ? await hashText(`${ip}_short_link_v1`) : null;
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const { device, browser } = parseDevice(userAgent);

    let country: string | null = null;
    let region: string | null = null;
    let city: string | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (ip) {
      try {
        const geoRes = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
          headers: { "User-Agent": "metrics-apk-shortener/1.0" },
        });
        if (geoRes.ok) {
          const geo = (await geoRes.json()) as any;
          country = typeof geo?.country_name === "string" ? geo.country_name : null;
          region = typeof geo?.region === "string" ? geo.region : null;
          city = typeof geo?.city === "string" ? geo.city : null;
          latitude = Number.isFinite(Number(geo?.latitude)) ? Number(geo.latitude) : null;
          longitude = Number.isFinite(Number(geo?.longitude)) ? Number(geo.longitude) : null;
        }
      } catch {
        // best-effort geolocation
      }
    }

    await cloud
      .from("app_short_links")
      .update({
        clicks: Number(row.clicks ?? 0) + 1,
        last_clicked_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    await cloud.from("visitor_sessions").upsert(
      {
        session_token: sessionToken,
        consent_given: false,
        user_agent: userAgent,
        referrer,
        utm_source: utmSource,
        utm_campaign: utmCampaign,
        country,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_token" },
    );

    await cloud.from("visitor_events").insert({
      session_id: sessionToken,
      event_name: "link_click",
      type: "link_click",
      path: accessPath,
      metadata: {
        short_link_id: row.id,
        store_id: row.store_id,
        slug,
        link_type: row.link_type,
        campaign_origin: row.campaign_origin,
        utm_source: utmSource,
        utm_campaign: utmCampaign,
      },
    });

    const { data: trackingSession } = await cloud
      .from("tracking_sessions")
      .upsert(
        {
          session_token: sessionToken,
          device: userAgent,
          source: referrer ?? "short_link",
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "session_token" },
      )
      .select("id")
      .single();

    if (trackingSession?.id) {
      await cloud.from("tracking_events").insert({
        session_id: trackingSession.id,
        type: "link_click",
        path: accessPath,
        metadata: {
          short_link_id: row.id,
          store_id: row.store_id,
          slug,
          link_type: row.link_type,
          campaign_origin: row.campaign_origin,
          utm_source: utmSource,
          utm_campaign: utmCampaign,
        },
      });
    }

    await cloud.from("app_short_link_clicks").insert({
      short_link_id: row.id,
      store_id: row.store_id,
      session_token: sessionToken,
      token_prefix: null,
      ip_hash: ipHash,
      user_agent: userAgent,
      device,
      browser,
      country,
      region,
      city,
      latitude,
      longitude,
      utm_source: utmSource,
      utm_campaign: utmCampaign,
      referrer,
    });

    if (row.link_type === "apk") {
      await cloud.from("visitor_events").insert({
        session_id: sessionToken,
        event_name: "download_apk",
        type: "download_apk",
        path: accessPath,
        metadata: {
          short_link_id: row.id,
          store_id: row.store_id,
          slug,
          campaign_origin: row.campaign_origin,
        },
      });

      if (trackingSession?.id) {
        await cloud.from("tracking_events").insert({
          session_id: trackingSession.id,
          type: "download_apk",
          path: accessPath,
          metadata: {
            short_link_id: row.id,
            store_id: row.store_id,
            slug,
            campaign_origin: row.campaign_origin,
          },
        });
      }

      await cloud.from("apk_downloads").insert({
        store_id: row.store_id,
        short_link_id: row.id,
        session_token: sessionToken,
        source_campaign: row.campaign_origin,
        utm_source: utmSource,
        utm_campaign: utmCampaign,
        ip_hash: ipHash,
        country,
        region,
        city,
        latitude,
        longitude,
        device,
        browser,
        user_agent: userAgent,
        status: "downloaded",
      });
    }

    return new Response(
      JSON.stringify({
        destination_url: row.original_url,
        session_token: sessionToken,
        link_type: row.link_type,
        campaign_origin: row.campaign_origin,
      }),
      {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("[short-link-resolve]", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
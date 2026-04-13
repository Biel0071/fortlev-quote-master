import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const textHash = async (raw: string) => {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
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

    const cloud = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const url = new URL(req.url);
    const token = String(url.searchParams.get("token") ?? "").trim();
    const sessionId = String(url.searchParams.get("session_id") ?? "").trim() || null;

    if (!token) {
      return new Response(JSON.stringify({ error: "missing_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: apk } = await cloud
      .from("apks")
      .select("id, store_id, file_path, file_name, version, active")
      .eq("download_token", token)
      .eq("active", true)
      .maybeSingle();

    if (!apk) {
      return new Response(JSON.stringify({ error: "apk_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || null;
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const { device, browser } = parseDevice(userAgent);
    const ipHash = ip ? await textHash(`${ip}_apk_download_v1`) : null;

    await cloud.from("visitor_events").insert({
      session_id: sessionId,
      event_name: "download_apk",
      type: "download_apk",
      path: `/api/apk/${token}`,
      metadata: {
        token,
        apk_id: apk.id,
        store_id: apk.store_id,
        device,
      },
    });

    if (sessionId) {
      const { data: trackingSession } = await cloud
        .from("tracking_sessions")
        .upsert(
          {
            session_token: sessionId,
            device: userAgent,
            source: "apk_link",
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "session_token" },
        )
        .select("id")
        .single();

      if (trackingSession?.id) {
        await cloud.from("tracking_events").insert({
          session_id: trackingSession.id,
          type: "download_apk",
          path: `/api/apk/${token}`,
          metadata: {
            token,
            apk_id: apk.id,
            store_id: apk.store_id,
            ip_hash: ipHash,
            device,
            browser,
          },
        });
      }
    }

    await cloud.from("apk_downloads").insert({
      store_id: apk.store_id,
      session_token: sessionId,
      ip_hash: ipHash,
      device,
      browser,
      user_agent: userAgent,
      status: "downloaded",
      metadata: {
        token,
        apk_id: apk.id,
      },
    });

    const { data: fileData, error: fileError } = await cloud.storage.from("apps").download(apk.file_path);
    if (fileError || !fileData) {
      return new Response(JSON.stringify({ error: "download_failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeName = apk.file_name?.trim() || `app${apk.version ? `-v${apk.version}` : ""}.apk`;
    const finalName = safeName.toLowerCase().endsWith(".apk") ? safeName : `${safeName}.apk`;

    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${finalName}"`,
        "Cache-Control": "public, max-age=120",
      },
    });
  } catch (error) {
    console.error("[download-apk-public]", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

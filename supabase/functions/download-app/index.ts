import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[download-app] Missing env vars", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      return new Response(
        JSON.stringify({ error: "Erro de configuração do servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Resolve store ---
    const url = new URL(req.url);
    const storeIdParam = url.searchParams.get("store_id");
    const host = req.headers.get("host") ?? "";

    let storeId: string | null = storeIdParam ?? null;

    // If no explicit store_id, try to resolve by domain
    if (!storeId) {
      const cleanHost = host.replace(/:\d+$/, "").toLowerCase();
      const { data: storeRow } = await supabase
        .from("stores")
        .select("id")
        .ilike("domain", cleanHost)
        .eq("active", true)
        .maybeSingle();

      storeId = storeRow?.id ?? null;
    }

    // Fallback: try legacy app_config (backwards-compat for single-store setups)
    if (!storeId) {
      return await legacyDownload(supabase, corsHeaders);
    }

    // --- Fetch active app for store ---
    const { data: app } = await supabase
      .from("store_apps")
      .select("app_name, file_path, file_name, version")
      .eq("store_id", storeId)
      .eq("active", true)
      .maybeSingle();

    if (!app) {
      // Try legacy fallback
      return await legacyDownload(supabase, corsHeaders);
    }

    // Build display filename
    let displayName = app.file_name || `${app.app_name}.apk`;
    if (!displayName.toLowerCase().endsWith(".apk")) {
      displayName += ".apk";
    }

    // Fetch the file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("apps")
      .download(app.file_path);

    if (fileError || !fileData) {
      console.error("[download-app] Storage error:", fileError);
      return new Response(
        JSON.stringify({ error: "Falha ao buscar APK" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${displayName}"`,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("[download-app]", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** Backwards-compatible download using app_config table */
async function legacyDownload(
  supabase: ReturnType<typeof createClient>,
  corsHeaders: Record<string, string>
) {
  const [{ data: urlRow }, { data: metaRow }] = await Promise.all([
    supabase.from("app_config").select("value").eq("key", "app_download_url").maybeSingle(),
    supabase.from("app_config").select("value").eq("key", "app_apk_meta").maybeSingle(),
  ]);

  const apkUrl = urlRow?.value;
  if (!apkUrl) {
    return new Response(
      JSON.stringify({ error: "Nenhum APK configurado" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let displayName = "app.apk";
  if (metaRow?.value) {
    try {
      const meta = JSON.parse(metaRow.value);
      if (meta.appName && meta.version) {
        displayName = `${meta.appName}-v${meta.version}.apk`;
      } else if (meta.displayName) {
        displayName = meta.displayName;
      }
    } catch { /* ignore */ }
  }
  if (!displayName.toLowerCase().endsWith(".apk")) displayName += ".apk";

  const fileRes = await fetch(apkUrl);
  if (!fileRes.ok) {
    return new Response(
      JSON.stringify({ error: "Falha ao buscar APK" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(fileRes.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": `attachment; filename="${displayName}"`,
      "Cache-Control": "no-cache",
    },
  });
}

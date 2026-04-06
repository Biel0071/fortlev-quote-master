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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch config
    const [{ data: urlRow }, { data: metaRow }] = await Promise.all([
      supabase.from("app_config").select("value").eq("key", "app_download_url").maybeSingle(),
      supabase.from("app_config").select("value").eq("key", "app_apk_meta").maybeSingle(),
    ]);

    const apkUrl = urlRow?.value;
    if (!apkUrl) {
      return new Response(JSON.stringify({ error: "Nenhum APK configurado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let displayName = "app.apk";
    if (metaRow?.value) {
      try {
        const meta = JSON.parse(metaRow.value);
        if (meta.displayName) displayName = meta.displayName;
      } catch { /* ignore */ }
    }

    // Ensure .apk extension
    if (!displayName.toLowerCase().endsWith(".apk")) {
      displayName += ".apk";
    }

    // Fetch the actual file
    const fileRes = await fetch(apkUrl);
    if (!fileRes.ok) {
      return new Response(JSON.stringify({ error: "Falha ao buscar APK" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = fileRes.body;

    // Log download (best-effort)
    supabase.from("app_config").upsert(
      {
        key: "app_download_count",
        value: String(Date.now()),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    ).then(() => {}).catch(() => {});

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${displayName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[download-app]", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

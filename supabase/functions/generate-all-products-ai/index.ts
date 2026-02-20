// Lovable Cloud function: generate-all-products-ai
// Generates AI previews (5 images + description + 10 comments) for eligible products in batches of 3.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-platform-runtime, x-supabase-client-platform-runtime-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 3;
const DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type Body = {
  // Optional controls
  offset?: number; // start offset
  maxBatches?: number; // safety guard
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !anon || !service) throw new Error("Backend env vars missing");

    const authHeader = req.headers.get("Authorization") ?? "";

    // Caller client (RLS) to validate user + role
    const userClient = createClient(url, anon, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
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

    const body = (req.method === "POST" ? ((await req.json()) as Body) : ({} as Body)) ?? ({} as Body);
    let offset = Math.max(0, Number(body.offset ?? 0) || 0);
    const maxBatches = Math.max(1, Math.min(200, Number(body.maxBatches ?? 200) || 200));

    // Admin client for reading eligible products + writing logs
    const admin = createClient(url, service);

    const { data: totalFound, error: countErr } = await admin.rpc("count_products_for_ai_generation");
    if (countErr) throw new Error(`count_failed:${countErr.message}`);

    const total_found = Number(totalFound ?? 0);

    let total_processed = 0;
    let total_success = 0;
    let total_error = 0;

    // Process in batches
    for (let b = 0; b < maxBatches; b++) {
      const { data: rows, error: fetchErr } = await admin.rpc("get_products_for_ai_generation", {
        p_offset: offset,
        p_limit: BATCH_SIZE,
      });

      if (fetchErr) throw new Error(`fetch_failed:${fetchErr.message}`);

      const ids = (rows ?? []).map((r: any) => String(r.id)).filter(Boolean);
      if (ids.length === 0) break;

      for (const productId of ids) {
        let status: "success" | "error" = "success";
        let message = "";

        try {
          // Call generate-product-preview, forwarding the original admin Authorization header
          const resp = await fetch(`${url}/functions/v1/generate-product-preview`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body: JSON.stringify({ productId }),
          });

          const text = await resp.text();
          if (!resp.ok) throw new Error(`preview_http_${resp.status}:${text}`);

          const parsed = (() => {
            try {
              return JSON.parse(text);
            } catch {
              return null;
            }
          })();

          if (!parsed?.ok) {
            throw new Error(parsed?.error ?? "preview_failed");
          }

          total_success++;
          message = "preview_created";
        } catch (e) {
          status = "error";
          message = e instanceof Error ? e.message : "unknown_error";
          total_error++;
        } finally {
          total_processed++;
          await admin.from("ai_generation_logs").insert({ product_id: productId, status, message } as any);
        }
      }

      offset += ids.length;

      // Delay between batches (if there's likely more work)
      if (offset < total_found) {
        await sleep(DELAY_MS);
      }
    }

    return new Response(
      JSON.stringify({
        total_found,
        total_processed,
        total_success,
        total_error,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("generate-all-products-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

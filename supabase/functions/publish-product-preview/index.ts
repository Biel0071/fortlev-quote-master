// Lovable Cloud function: publish-product-preview
// Publishes an AI preview: inserts images into store_product_images, writes description, inserts comments, sets status=published.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-platform-runtime, x-supabase-client-platform-runtime-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  previewId: string;
  overwriteImages?: boolean;
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

    const body = (await req.json()) as Body;
    const previewId = String(body?.previewId ?? "").trim();
    const overwriteImages = Boolean(body?.overwriteImages);

    if (!previewId) {
      return new Response(JSON.stringify({ error: "previewId_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client (service role) for DB writes + storage
    const admin = createClient(url, service);

    const { data: pv, error: pvErr } = await admin
      .from("product_ai_previews")
      .select("id, product_id, approved, generated_description, generated_comments_json, generated_images_json")
      .eq("id", previewId)
      .maybeSingle();

    if (pvErr || !pv) {
      return new Response(JSON.stringify({ error: "preview_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((pv as any).approved) {
      return new Response(JSON.stringify({ error: "preview_already_approved" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productId = String((pv as any).product_id);

    // Overwrite images if requested
    if (overwriteImages) {
      const { data: existing } = await admin
        .from("store_product_images")
        .select("id, path")
        .eq("product_id", productId);

      const paths = (existing ?? []).map((x: any) => String(x.path)).filter(Boolean);
      await admin.from("store_product_images").delete().eq("product_id", productId);
      if (paths.length > 0) {
        const { error: remErr } = await admin.storage.from("product-images").remove(paths);
        if (remErr) console.error("storage remove error", remErr);
      }
    }

    // Determine next sort base
    const { data: lastImg } = await admin
      .from("store_product_images")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const baseSort = Math.max(-1, Number((lastImg as any)?.sort_order ?? -1)) + 1;

    const imgs = Array.isArray((pv as any).generated_images_json) ? ((pv as any).generated_images_json as any[]) : [];
    const imgInserts = imgs
      .map((im, idx) => ({
        product_id: productId,
        path: String(im?.path ?? ""),
        sort_order: baseSort + idx,
      }))
      .filter((x) => x.path);

    if (imgInserts.length > 0) {
      const { error: imgErr } = await admin.from("store_product_images").insert(imgInserts as any);
      if (imgErr) throw new Error(`images_insert_failed:${imgErr.message}`);
    }

    // Update product description + publish
    const { error: upErr } = await admin
      .from("store_products")
      .update({
        description: (pv as any).generated_description ?? null,
        status: "published",
      } as any)
      .eq("id", productId);

    if (upErr) throw new Error(`product_update_failed:${upErr.message}`);

    // Insert comments
    const comments = Array.isArray((pv as any).generated_comments_json) ? ((pv as any).generated_comments_json as any[]) : [];

    const commentInserts = comments
      .map((c) => ({
        product_id: productId,
        author_name: String(c?.author_name ?? "Cliente"),
        rating: Math.max(1, Math.min(5, Number(c?.rating ?? 5) || 5)),
        comment_text: String(c?.comment_text ?? ""),
      }))
      .filter((c) => c.comment_text.trim().length > 0)
      .slice(0, 10);

    if (commentInserts.length > 0) {
      const { error: cErr } = await admin.from("product_comments").insert(commentInserts as any);
      if (cErr) throw new Error(`comments_insert_failed:${cErr.message}`);
    }

    // Mark preview as approved
    const { error: apprErr } = await admin
      .from("product_ai_previews")
      .update({ approved: true, approved_at: new Date().toISOString() } as any)
      .eq("id", previewId);

    if (apprErr) throw new Error(`preview_approve_failed:${apprErr.message}`);

    return new Response(JSON.stringify({ ok: true, product_id: productId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-product-preview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { products, clearExisting } = await req.json();

    if (!Array.isArray(products) || products.length === 0) {
      return new Response(JSON.stringify({ error: "No products provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load categories map
    const { data: cats } = await supabase.from("store_categories").select("id, name");
    const catMap: Record<string, string> = {};
    for (const c of cats ?? []) {
      catMap[c.name.toLowerCase().trim()] = c.id;
    }

    // Optionally clear existing products
    if (clearExisting) {
      await supabase.from("store_product_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("store_products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    let inserted = 0;
    let errors = 0;
    const batchSize = 100;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const rows = batch.map((p: any) => {
        const categoryId = catMap[(p.category || "").toLowerCase().trim()] || null;
        return {
          sku: String(p.sku || ""),
          name: String(p.name || "Sem nome"),
          category: String(p.category || ""),
          category_id: categoryId,
          unit: String(p.unit || "UN"),
          price: parseFloat(p.price) || 0,
          promo_price: parseFloat(p.promoPrice) || 0,
          stock: 100,
          active: true,
          status: "published",
          description: p.description || null,
        };
      });

      const { data, error } = await supabase
        .from("store_products")
        .upsert(rows, { onConflict: "sku", ignoreDuplicates: false })
        .select("id");

      if (error) {
        console.error("Batch error:", error.message);
        errors += batch.length;
      } else {
        inserted += (data?.length ?? 0);
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted, errors, total: products.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

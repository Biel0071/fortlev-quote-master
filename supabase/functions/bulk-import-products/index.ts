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

    const body = await req.json();
    const { products, rawText, clearExisting } = body;

    // Load categories map
    const { data: cats } = await supabase.from("store_categories").select("id, name");
    const catMap: Record<string, string> = {};
    for (const c of cats ?? []) {
      catMap[c.name.toLowerCase().trim()] = c.id;
    }

    let items: any[] = [];

    if (rawText) {
      // Parse pipe-delimited format: |SKU|Name|Category|Subcategory|Brand|Unit|MarketPrice|StorePrice|
      const lines = rawText.split("\n").filter((l: string) => l.trim() && !l.includes("---") && !l.toLowerCase().includes("sku|produto"));
      for (const line of lines) {
        const cols = line.split("|").map((c: string) => c.trim()).filter(Boolean);
        if (cols.length < 8) continue;
        const [sku, name, category, subcategory, brand, unit, marketPrice, storePrice] = cols;
        if (!name || name.toLowerCase() === 'produto') continue;
        items.push({
          sku, name, category, unit,
          price: parseFloat(marketPrice) || 0,
          promoPrice: parseFloat(storePrice) || 0,
          description: [brand, subcategory].filter(Boolean).join(" | "),
        });
      }
    } else if (Array.isArray(products)) {
      items = products;
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "No products found", count: 0 }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (clearExisting) {
      await supabase.from("store_product_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("store_products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    let inserted = 0;
    let errors = 0;
    const batchSize = 200;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
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
        .insert(rows)
        .select("id");

      if (error) {
        console.error("Batch error:", error.message);
        // Try individual inserts on conflict
        for (const row of rows) {
          const { error: singleErr } = await supabase
            .from("store_products")
            .upsert(row, { onConflict: "sku" });
          if (singleErr) {
            errors++;
          } else {
            inserted++;
          }
        }
      } else {
        inserted += (data?.length ?? 0);
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted, errors, total: items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

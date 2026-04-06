import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, segment, style, price_range, plan_slug } = await req.json();

    if (!name || !segment) {
      return new Response(JSON.stringify({ error: "name and segment are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Ask AI to generate store structure
    const prompt = `You are a store creation assistant. Given the following info, generate a JSON object for a new e-commerce store.

Store name: ${name}
Segment/niche: ${segment}
Style: ${style || "modern"}
Price range: ${price_range || "medium"}

Return ONLY valid JSON with this structure:
{
  "slug": "store-slug-here",
  "description": "Short store description",
  "theme": {
    "primary_color": "#hex",
    "secondary_color": "#hex",
    "accent_color": "#hex"
  },
  "categories": [
    { "name": "Category Name", "description": "Short desc" }
  ],
  "products": [
    { "name": "Product Name", "category": "Category Name", "price": 99.90, "unit": "UN", "description": "Short desc" }
  ]
}

Generate 4-6 categories and 8-12 products relevant to the segment. Prices in BRL. Product names in Portuguese.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a helpful assistant that returns only valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_store_structure",
              description: "Create store structure with categories and products",
              parameters: {
                type: "object",
                properties: {
                  slug: { type: "string" },
                  description: { type: "string" },
                  theme: {
                    type: "object",
                    properties: {
                      primary_color: { type: "string" },
                      secondary_color: { type: "string" },
                      accent_color: { type: "string" },
                    },
                    required: ["primary_color", "secondary_color", "accent_color"],
                  },
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["name"],
                    },
                  },
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        category: { type: "string" },
                        price: { type: "number" },
                        unit: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["name", "price"],
                    },
                  },
                },
                required: ["slug", "categories", "products"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_store_structure" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const storeData = JSON.parse(toolCall.function.arguments);

    // 2. Find plan
    let planId: string | null = null;
    if (plan_slug) {
      const { data: plan } = await supabase
        .from("store_plans")
        .select("id")
        .eq("slug", plan_slug)
        .maybeSingle();
      planId = plan?.id ?? null;
    }

    // 3. Create store
    const slug = storeData.slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { data: newStore, error: storeErr } = await supabase
      .from("stores")
      .insert({
        name,
        slug,
        active: true,
        segment,
        plan_id: planId,
      })
      .select("id")
      .single();

    if (storeErr) throw new Error("Failed to create store: " + storeErr.message);
    const storeId = newStore.id;

    // 4. Init permissions
    await supabase.rpc("init_store_permissions", { _store_id: storeId });
    if (planId) {
      await supabase.rpc("apply_plan_permissions", { _store_id: storeId, _plan_id: planId });
    }

    // 5. Create categories
    const categoryMap: Record<string, string> = {};
    for (const cat of storeData.categories ?? []) {
      const { data: catRow } = await supabase
        .from("store_categories")
        .insert({
          name: cat.name,
          description: cat.description || null,
          store_id: storeId,
          active: true,
        })
        .select("id")
        .single();
      if (catRow) categoryMap[cat.name] = catRow.id;
    }

    // 6. Create products
    for (const prod of storeData.products ?? []) {
      const catId = categoryMap[prod.category] ?? null;
      await supabase.from("store_products").insert({
        name: prod.name,
        price: prod.price ?? 0,
        unit: prod.unit ?? "UN",
        description: prod.description || null,
        category: prod.category || null,
        category_id: catId,
        store_id: storeId,
        active: true,
        status: "published",
        stock: 100,
      });
    }

    // 7. Save theme config
    if (storeData.theme) {
      await supabase.from("app_config").upsert(
        {
          key: `theme_${storeId}`,
          value: JSON.stringify(storeData.theme),
        },
        { onConflict: "key" }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        store_id: storeId,
        slug,
        categories_created: Object.keys(categoryMap).length,
        products_created: (storeData.products ?? []).length,
        theme: storeData.theme,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-create-store error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

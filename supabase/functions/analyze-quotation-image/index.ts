import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, image } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages = [
      {
        role: "system",
        content: `Você é um especialista em materiais de construção e sistemas ERP. 
        Sua tarefa é analisar um texto ou imagem de um pedido/orçamento e extrair os itens em formato JSON.
        Retorne um objeto JSON com uma chave 'items' contendo um array de objetos com:
        - originalText: o texto original do item
        - productName: nome padronizado do produto
        - quantity: quantidade (número)
        - unit: unidade (ex: un, m, kg, cx)
        
        Seja preciso e tente identificar o máximo de detalhes possível.
        Se não houver quantidade, assuma 1.`,
      },
    ];

    const userContent: any[] = [];
    if (text) {
      userContent.push({ type: "text", text: `Analise este pedido: ${text}` });
    }
    if (image) {
      // image is expected to be base64 data URL
      const base64Data = image.split(",")[1] || image;
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${base64Data}` },
      });
    }

    messages.push({ role: "user", content: userContent as any });

    const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Use a vision capable model
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!gatewayResp.ok) {
      const errorText = await gatewayResp.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${gatewayResp.status}`);
    }

    const data = await gatewayResp.json();
    const result = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-quotation-image:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

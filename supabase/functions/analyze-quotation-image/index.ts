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
        Sua tarefa é analisar um texto ou imagem de um pedido/orçamento e extrair os itens e dados do cliente em formato JSON.

        IMPORTANTE: 
        1. Desconsidere metadados de conversas de chat (como timestamps [14:37, 19/05/2026], nomes de atendentes, etc). 
        2. Identifique dados do cliente: nome completo, CPF/CNPJ, e-mail, telefone e endereço completo.
        3. No endereço, identifique e inclua o CEP se disponível.
        4. Se houver pontos de referência ou instruções de entrega (ex: "em frente à padaria", "casa verde"), extraia isso para o campo "observations".
        5. Identifique os itens do orçamento: nome do produto, quantidade, unidade e preço unitário se disponível.
        6. Identifique validade do orçamento ou prazos de entrega se mencionados.
        
        Retorne um objeto JSON estrito com esta estrutura:
        {
          "customer": { 
            "name": "string", 
            "document": "string (CPF ou CNPJ)", 
            "email": "string", 
            "phone": "string", 
            "address": "string (completo com CEP e UF)" 
          },
          "items": [
            { 
              "originalText": "string (como aparece no original)", 
              "productName": "string (nome normalizado)", 
              "quantity": number, 
              "unit": "string (un, m, kg, etc)", 
              "price": number (preço unitário, 0 se não houver) 
            }
          ],
          "observations": "string (incluindo referências de local e notas)",
          "validity": "string (ex: '7 dias')",
          "deliveryTime": "string (ex: '24 horas')",
          "freight": number (valor de frete se explicitamente mencionado, caso contrário nulo),
          "sellerName": "string (nome de vendedor se mencionado)"
        }
        
        Seja preciso. Se não houver quantidade, assuma 1. Limpe textos de conversa, foque nos dados comerciais.`,
      },
    ];

    const userContent: any[] = [];
    if (text) {
      userContent.push({ type: "text", text: `Analise este pedido/conversa e gere o JSON: ${text}` });
    }
    if (image) {
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
        model: "openai/gpt-5-mini", // Corrected model name for this environment
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
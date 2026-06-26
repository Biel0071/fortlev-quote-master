// Edge function: processa fila de media_import_jobs com IA (Lovable AI Gateway)
// Para cada arquivo (foto ou vídeo já com frames extraídos no cliente):
//  1) Envia melhor frame para o modelo de visão
//  2) IA devolve nome, descrição, categoria, tags
//  3) Cria produto draft + store_product_images (+ vídeo, se houver)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Job = {
  id: string;
  store_id: string;
  media_type: "image" | "video";
  file_url: string;
  file_name: string;
  frame_urls: string[] | null;
};

type Category = { id: string; name: string };

type AiResult = {
  name: string;
  description: string;
  category_name: string;
  tags: string[];
  confidence: number;
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function callAi(imageUrl: string, categories: Category[]): Promise<AiResult> {
  const catList = categories.map((c) => c.name).join(", ") || "(nenhuma)";
  const prompt = `Você analisa imagens de produtos para um e-commerce brasileiro.
Categorias disponíveis na loja: ${catList}.

Retorne APENAS JSON válido, sem markdown, no formato:
{"name":"Nome comercial curto em PT-BR","description":"2-3 frases vendedoras","category_name":"Categoria mais adequada da lista (ou sugerida)","tags":["tag1","tag2","tag3"],"confidence":0-100}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  const clean = String(raw).replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return {
    name: String(parsed.name ?? "Produto sem nome").slice(0, 180),
    description: String(parsed.description ?? "").slice(0, 1200),
    category_name: String(parsed.category_name ?? ""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [],
    confidence: Number(parsed.confidence ?? 0),
  };
}

async function processJob(job: Job, categories: Category[]) {
  await supabase
    .from("media_import_jobs")
    .update({ status: "processing", processing_started_at: new Date().toISOString(), progress: 25 })
    .eq("id", job.id);

  // Para vídeo, usar o frame do meio (índice 2 dos 5 enviados); para imagem, o próprio file_url
  const frames = Array.isArray(job.frame_urls) ? job.frame_urls : [];
  const analysisUrl =
    job.media_type === "video" && frames.length > 0
      ? frames[Math.floor(frames.length / 2)]
      : job.file_url;

  const ai = await callAi(analysisUrl, categories);
  await supabase.from("media_import_jobs").update({ progress: 70, status: "creating" }).eq("id", job.id);

  const matched = categories.find(
    (c) => c.name.trim().toLowerCase() === ai.category_name.trim().toLowerCase(),
  );

  // Cria produto draft
  const { data: product, error: prodErr } = await supabase
    .from("store_products")
    .insert({
      store_id: job.store_id,
      name: ai.name,
      description: ai.description,
      category: matched?.name ?? ai.category_name,
      category_id: matched?.id ?? null,
      price: 0,
      stock: 0,
      active: false,
      status: "draft",
    })
    .select("id")
    .single();

  if (prodErr || !product) throw new Error(`Falha ao criar produto: ${prodErr?.message}`);

  // Galeria: frames (vídeo) ou a própria foto
  const galleryUrls: string[] =
    job.media_type === "video" && frames.length > 0 ? frames : [job.file_url];

  const images = galleryUrls.map((url, idx) => ({
    product_id: product.id,
    path: url,
    sort_order: idx,
    media_type: "image",
  }));

  if (job.media_type === "video") {
    images.push({
      product_id: product.id,
      path: job.file_url,
      sort_order: 99,
      media_type: "video",
    });
  }

  await supabase.from("store_product_images").insert(images);

  await supabase
    .from("media_import_jobs")
    .update({
      status: "completed",
      progress: 100,
      ai_result: ai,
      product_id: product.id,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const batchId: string | undefined = body.batch_id;
    const storeId: string | undefined = body.store_id;

    if (!batchId || !storeId) {
      return new Response(JSON.stringify({ error: "batch_id e store_id obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: jobs, error: jobsErr } = await supabase
      .from("media_import_jobs")
      .select("id, store_id, media_type, file_url, file_name, frame_urls")
      .eq("batch_id", batchId)
      .eq("store_id", storeId)
      .eq("status", "queued")
      .order("batch_position", { ascending: true });

    if (jobsErr) throw jobsErr;

    const { data: cats } = await supabase
      .from("store_categories")
      .select("id, name")
      .eq("store_id", storeId);

    const categories = (cats ?? []) as Category[];
    const list = (jobs ?? []) as Job[];

    let success = 0;
    let failed = 0;
    for (const job of list) {
      try {
        await processJob(job, categories);
        success++;
      } catch (err) {
        failed++;
        await supabase
          .from("media_import_jobs")
          .update({
            status: "failed",
            error_message: String((err as Error).message ?? err).slice(0, 1000),
          })
          .eq("id", job.id);
      }
    }

    return new Response(JSON.stringify({ processed: list.length, success, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error).message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

import { cloud } from "@/lib/cloud";

export type ImageSearchSource = "bing" | "google" | "mercado_livre" | "amazon" | "shopee" | "alibaba";

export type GoogleImageResult = {
  imageUrl: string;
  thumbnail: string;
  title: string;
  source?: ImageSearchSource;
  width?: number;
  height?: number;
};

type SearchResponse = {
  images?: GoogleImageResult[];
  cached?: boolean;
  error?: string;
};

type ImportResponse = {
  ok?: boolean;
  imported?: Array<{ path: string; public_url: string; sort_order: number }>;
  requested?: number;
  failed?: number;
  error?: string;
};

export type PipelineResult = {
  ok: boolean;
  product_id: string;
  saved: Array<{ path: string; public_url: string; sort_order: number; confidence: number }>;
  ai_calls_used: number;
  candidates_found: number;
  candidates_filtered: number;
  candidates_scored: number;
  validated: Array<{ url: string; heuristic: number; confidence: number; status: string; analysis: string }>;
  fallback_needed: boolean;
  log: string[];
  error?: string;
};

export type ImportImagesResult = {
  imported: Array<{ path: string; public_url: string; sort_order: number }>;
  requested: number;
  failed: number;
};

function getFunctionsBaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return `${url}/functions/v1`;
}

async function authHeaders() {
  const { data } = await cloud.auth.getSession();
  const token = data.session?.access_token;
  return {
    Authorization: token ? `Bearer ${token}` : "",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    "Content-Type": "application/json",
  };
}

export async function searchGoogleProductImages(params: {
  query: string;
  start?: number;
  source?: ImageSearchSource;
}) {
  const q = params.query.trim();
  const start = Number(params.start ?? 1);
  const source = params.source ?? "bing";
  const headers = await authHeaders();
  const qs = new URLSearchParams({ q, start: String(start), source });

  const response = await fetch(`${getFunctionsBaseUrl()}/search-product-images?${qs.toString()}`, {
    method: "GET",
    headers,
  });

  const json = (await response.json().catch(() => ({}))) as SearchResponse;
  if (!response.ok) {
    const errorCode = json?.error ?? "";
    let friendlyMsg = "Não foi possível buscar imagens agora.";

    if (errorCode === "unauthorized") friendlyMsg = "Sessão expirada. Faça login novamente.";
    else if (errorCode === "forbidden") friendlyMsg = "Acesso negado. Você precisa ser administrador.";
    else if (errorCode === "daily_limit_exceeded") friendlyMsg = "Limite diário de buscas atingido. Tente novamente amanhã.";
    else if (errorCode === "invalid_query") friendlyMsg = "Digite um nome de produto válido para buscar.";
    else if (errorCode === "no_images_found") friendlyMsg = "Nenhuma imagem encontrada nessa fonte. Tente outra fonte.";
    else if (errorCode === "search_unavailable") friendlyMsg = "Fonte temporariamente indisponível. Tente outra fonte.";
    else if (json?.error) friendlyMsg = json.error;

    throw new Error(friendlyMsg);
  }

  return {
    images: json.images ?? [],
    cached: Boolean(json.cached),
  };
}

export async function importGoogleProductImages(params: {
  productId: string;
  images: GoogleImageResult[];
}): Promise<ImportImagesResult> {
  const headers = await authHeaders();

  const response = await fetch(`${getFunctionsBaseUrl()}/search-product-images`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "import",
      productId: params.productId,
      images: params.images,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ImportResponse;

  if (!response.ok || !payload.ok) {
    const errorCode = payload?.error ?? "";
    let friendlyMsg = "Não foi possível importar imagens.";

    if (errorCode === "unauthorized") friendlyMsg = "Sessão expirada. Faça login novamente.";
    else if (errorCode === "forbidden") friendlyMsg = "Acesso negado. Você precisa ser administrador.";
    else if (errorCode === "product_not_found") friendlyMsg = "Produto não encontrado para vincular as imagens.";
    else if (errorCode === "invalid_payload") friendlyMsg = "Selecione imagens válidas para importar.";
    else if (errorCode === "no_valid_images") {
      friendlyMsg = "Não foi possível salvar as imagens selecionadas. Tente outras opções da lista.";
    } else if (payload?.error) {
      friendlyMsg = payload.error;
    }

    throw new Error(friendlyMsg);
  }

  const imported = payload.imported ?? [];
  const requested = Number(payload.requested ?? params.images.length);
  const failed = Number(payload.failed ?? Math.max(0, requested - imported.length));

  return { imported, requested, failed };
}


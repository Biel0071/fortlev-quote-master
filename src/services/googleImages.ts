import { cloud } from "@/lib/cloud";

export type GoogleImageResult = {
  imageUrl: string;
  thumbnail: string;
  title: string;
};

type SearchResponse = {
  images?: GoogleImageResult[];
  cached?: boolean;
  error?: string;
};

type ImportResponse = {
  ok?: boolean;
  imported?: Array<{ path: string; public_url: string; sort_order: number }>;
  error?: string;
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
  };
}

export async function searchGoogleProductImages(params: { query: string; start?: number }) {
  const q = params.query.trim();
  const start = Number(params.start ?? 1);
  const headers = await authHeaders();
  const qs = new URLSearchParams({ q, start: String(start) });

  const response = await fetch(`${getFunctionsBaseUrl()}/search-product-images?${qs.toString()}`, {
    method: "GET",
    headers,
  });

  const json = (await response.json().catch(() => ({}))) as SearchResponse;
  if (!response.ok) {
    const error = json?.error ?? "Não foi possível buscar imagens agora.";
    throw new Error(error);
  }

  return {
    images: json.images ?? [],
    cached: Boolean(json.cached),
  };
}

export async function importGoogleProductImages(params: {
  productId: string;
  images: GoogleImageResult[];
}) {
  const { data, error } = await cloud.functions.invoke("search-product-images", {
    body: {
      action: "import",
      productId: params.productId,
      images: params.images,
    },
  });

  if (error) throw new Error(error.message);
  const payload = (data ?? {}) as ImportResponse;
  if (!payload.ok) throw new Error(payload.error ?? "Falha ao importar imagens");

  return payload.imported ?? [];
}

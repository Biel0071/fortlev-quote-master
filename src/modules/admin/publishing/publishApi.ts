const API_BASE = "/api/store-publish";

export type PublishApiError = Error & { code?: string; status?: number };

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null) as {
    success?: boolean;
    error?: { code?: string; message?: string };
  } | null;
  if (!response.ok || body?.success === false) {
    const error = new Error(body?.error?.message ?? "A API de publicação está indisponível.") as PublishApiError;
    error.code = body?.error?.code;
    error.status = response.status;
    throw error;
  }
  return body as T;
}

export function fetchPublishStatus(accessToken: string, fetcher?: typeof fetch) {
  return request<{ success: true; configured: boolean; canPublish: boolean; [key: string]: unknown }>(
    "/status", accessToken, {}, fetcher,
  );
}

export function fetchPublishHistory(accessToken: string, fetcher?: typeof fetch) {
  return request<{ success: true; runs: Array<Record<string, unknown>> }>(
    "/history", accessToken, {}, fetcher,
  );
}

export function startPublish(
  accessToken: string,
  input: { requestId: string; expectedSha: string; selectedPages?: string[] },
  fetcher?: typeof fetch,
) {
  return request<{ success: true; requestId: string; run: Record<string, unknown> }>(
    "/runs",
    accessToken,
    {
      method: "POST",
      headers: { "Idempotency-Key": input.requestId },
      body: JSON.stringify(input),
    },
    fetcher,
  );
}

export function fetchPublishRun(runId: number | string, accessToken: string, fetcher?: typeof fetch) {
  return request<{ success: true; run: Record<string, unknown> }>(
    `/runs/${encodeURIComponent(String(runId))}`, accessToken, {}, fetcher,
  );
}

export function fetchPublishLogs(runId: number | string, accessToken: string, fetcher?: typeof fetch) {
  return fetcher(`${API_BASE}/runs/${encodeURIComponent(String(runId))}/logs`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then(async (response) => {
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      throw new Error(body?.error?.message ?? "Não foi possível baixar os logs desta publicação.");
    }
    return response.blob();
  });
}

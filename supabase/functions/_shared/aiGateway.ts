type AiGatewayConfig = { baseUrl: string; apiKey: string };

export function buildAiGatewayUrl(baseUrl: string, route: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const suffix = route.startsWith("/") ? route : `/${route}`;
  const normalizedSuffix = base.endsWith("/v1") && suffix.startsWith("/v1/")
    ? suffix.slice(3)
    : suffix;

  return `${base}${normalizedSuffix}`;
}

export function getAiGatewayConfig(): AiGatewayConfig {
  const config = getOptionalAiGatewayConfig();
  if (!config) throw new Error("AI_GATEWAY_URL and AI_GATEWAY_API_KEY must be configured");
  return config;
}

export function getOptionalAiGatewayConfig(): AiGatewayConfig | null {
  const baseUrl = Deno.env.get("AI_GATEWAY_URL")?.trim().replace(/\/+$/, "");
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY")?.trim();
  if (!baseUrl || !apiKey) return null;

  const parsed = new URL(baseUrl);
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error("AI_GATEWAY_URL must use HTTP or HTTPS");
  }

  return { baseUrl, apiKey };
}

export function aiGatewayUrl(route: string): string {
  return buildAiGatewayUrl(getAiGatewayConfig().baseUrl, route);
}

export function getAiModel(capability: "text" | "vision" = "text"): string {
  const setting = capability === "vision" ? "AI_VISION_MODEL" : "AI_TEXT_MODEL";
  return Deno.env.get(setting)?.trim() || "auto";
}

export function aiGatewayHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function generateImageBytes(
  prompt: string,
  options: Record<string, unknown> = {},
): Promise<Uint8Array> {
  const { baseUrl, apiKey } = getAiGatewayConfig();
  const response = await fetch(buildAiGatewayUrl(baseUrl, "/v1/image"), {
    method: "POST",
    headers: aiGatewayHeaders(apiKey),
    body: JSON.stringify({ ...options, prompt, wait: true }),
  });

  if (!response.ok) {
    throw new Error(`Image gateway request failed (${response.status})`);
  }

  const payload = await response.json();
  const image = payload?.result?.images?.[0];
  const base64 = image?.base64 ?? image?.b64_json;
  if (typeof base64 === "string" && base64.length > 0) {
    const encoded = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
    const binary = atob(encoded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  if (typeof image?.url === "string" && image.url.length > 0) {
    const url = new URL(image.url, baseUrl);
    if (url.origin !== new URL(baseUrl).origin) {
      throw new Error("Image gateway returned a URL outside the configured origin");
    }

    const imageResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!imageResponse.ok) {
      throw new Error(`Image download failed (${imageResponse.status})`);
    }
    return new Uint8Array(await imageResponse.arrayBuffer());
  }

  throw new Error("Image gateway response did not contain image data");
}

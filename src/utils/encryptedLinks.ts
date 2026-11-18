/**
 * Utilidade de roteamento criptografado (/r/enc1_...) com integridade FNV-1a,
 * proteção anti-open-redirect e detecção de canal (Site vs App).
 */

const CLOAK_KEY = "material_online_cloak_v1_key";

export type TrackingChannel = "site" | "app";

export type EncryptedLinkPayload = {
  targetUrl: string;
  source: string;
  label: string;
  channel: TrackingChannel;
};

const SAFE_EXTERNAL_HOSTS = new Set(["wa.me", "materialdecontrucao.online", "www.materialdecontrucao.online"]);

export function detectAppChannel(pathname?: string): TrackingChannel {
  const path =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  if (/^\/(google-play|downloads|app\/|myjadlog)/i.test(path)) {
    return "app";
  }
  if (typeof window !== "undefined") {
    try {
      if (window.matchMedia?.("(display-mode: standalone)")?.matches) {
        return "app";
      }
      const search = window.location.search || "";
      if (/[?&](utm_source|channel)=app(?:&|$)/i.test(search)) {
        return "app";
      }
    } catch {
      /* ignore browser environment errors */
    }
  }
  return "site";
}

export function isSafeRedirectTarget(rawUrl: string): boolean {
  const url = String(rawUrl ?? "").trim();
  if (!url || url.length > 512) return false;
  if (/[\r\n\0]/.test(url)) return false;

  // Relative single-slash routes only (reject //host, /\host, /admin, /auth, /r/)
  if (url.startsWith("/")) {
    if (url.startsWith("//") || url.startsWith("/\\")) return false;
    if (/^\/(admin|auth|r)(\/|$)/i.test(url)) return false;
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && SAFE_EXTERNAL_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token: string): Uint8Array | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function fnv1a32(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function xorWithKey(bytes: Uint8Array): Uint8Array {
  const keyBytes = new TextEncoder().encode(CLOAK_KEY);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff);
  }
  return out;
}

/**
 * Codifica qualquer URL segura da loja ou WhatsApp para /r/enc1_<token>.
 */
export function encodeEncryptedLink(
  targetUrl: string,
  meta?: { source?: string; label?: string; channel?: TrackingChannel },
): string {
  const cleanTarget = String(targetUrl ?? "").trim();
  if (!isSafeRedirectTarget(cleanTarget)) {
    return cleanTarget;
  }

  const compact = JSON.stringify({
    u: cleanTarget,
    s: String(meta?.source || "/").slice(0, 120),
    l: String(meta?.label || "nav").slice(0, 48),
    c: meta?.channel === "app" ? "app" : "site",
    v: 1,
  });

  const plainBytes = new TextEncoder().encode(compact);
  const masked = xorWithKey(plainBytes);
  const checksum = fnv1a32(plainBytes);

  const envelope = new Uint8Array(4 + masked.length);
  envelope[0] = (checksum >>> 24) & 0xff;
  envelope[1] = (checksum >>> 16) & 0xff;
  envelope[2] = (checksum >>> 8) & 0xff;
  envelope[3] = checksum & 0xff;
  envelope.set(masked, 4);

  return `/r/enc1_${toBase64Url(envelope)}`;
}

/**
 * Decodifica um slug enc1_..., valida checksum FNV-1a e garante destino seguro.
 */
export function decodeEncryptedToken(slug: string): EncryptedLinkPayload | null {
  const clean = String(slug ?? "").trim();
  if (!clean.startsWith("enc1_")) return null;

  const raw = clean.slice(5);
  const envelope = fromBase64Url(raw);
  if (!envelope || envelope.length < 6) return null;

  const expectedChecksum =
    ((envelope[0] << 24) | (envelope[1] << 16) | (envelope[2] << 8) | envelope[3]) >>> 0;
  const masked = envelope.subarray(4);
  const plainBytes = xorWithKey(masked);

  if (fnv1a32(plainBytes) !== expectedChecksum) {
    return null;
  }

  try {
    const text = new TextDecoder().decode(plainBytes);
    const parsed = JSON.parse(text) as {
      u?: unknown;
      s?: unknown;
      l?: unknown;
      c?: unknown;
      v?: unknown;
    };
    if (parsed.v !== 1 || typeof parsed.u !== "string") return null;
    if (!isSafeRedirectTarget(parsed.u)) return null;

    return {
      targetUrl: parsed.u,
      source: typeof parsed.s === "string" ? parsed.s : "/",
      label: typeof parsed.l === "string" ? parsed.l : "encrypted_link",
      channel: parsed.c === "app" ? "app" : "site",
    };
  } catch {
    return null;
  }
}

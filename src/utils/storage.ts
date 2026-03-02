import { cloud } from "@/lib/cloud";

function stripQueryAndHash(value: string) {
  return value.split("?")[0]?.split("#")[0] ?? value;
}

export function normalizeStorageObjectPath(bucket: string, path?: string | null) {
  if (!path) return "";

  const trimmed = path.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("blob:")) return "";

  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = trimmed.indexOf(publicMarker);
  if (markerIndex >= 0) {
    return decodeURIComponent(stripQueryAndHash(trimmed.slice(markerIndex + publicMarker.length))).replace(/^\/+/, "");
  }

  const normalized = trimmed.replace(/^\/+/, "");
  const prefixedPath = `storage/v1/object/public/${bucket}/`;
  if (normalized.startsWith(prefixedPath)) {
    return decodeURIComponent(stripQueryAndHash(normalized.slice(prefixedPath.length))).replace(/^\/+/, "");
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  return stripQueryAndHash(normalized);
}

export function publicImageUrl(bucket: string, path?: string | null) {
  const normalized = normalizeStorageObjectPath(bucket, path);
  if (!normalized) return "";
  if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("blob:")) {
    return normalized;
  }
  return cloud.storage.from(bucket).getPublicUrl(normalized).data.publicUrl;
}



import { cloud } from "@/lib/cloud";

function normalizePublicPath(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  return path.replace(/^\/+/, "");
}

export function publicImageUrl(bucket: string, path?: string | null) {
  const normalized = normalizePublicPath(path);
  if (!normalized) return "";
  if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("blob:")) {
    return normalized;
  }
  return cloud.storage.from(bucket).getPublicUrl(normalized).data.publicUrl;
}


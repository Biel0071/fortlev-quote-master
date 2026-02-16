import { cloud } from "@/lib/cloud";

export function publicImageUrl(bucket: string, path?: string | null) {
  if (!path) return "";
  return cloud.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

import { normalizeStorageObjectPath, publicImageUrl } from "@/utils/storage";

export const SITE_BANNERS_BUCKET = "site-banners";
export const LEGACY_BANNERS_BUCKET = "banner-images";
export const MAX_BANNER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function normalizeBannerObjectPath(path?: string | null) {
  return (
    normalizeStorageObjectPath(SITE_BANNERS_BUCKET, path) ||
    normalizeStorageObjectPath(LEGACY_BANNERS_BUCKET, path)
  );
}

export function getBannerImageUrls(path?: string | null) {
  const normalized = normalizeBannerObjectPath(path);
  if (!normalized) {
    return { primary: "", legacy: "" };
  }

  return {
    primary: publicImageUrl(SITE_BANNERS_BUCKET, normalized),
    legacy: publicImageUrl(LEGACY_BANNERS_BUCKET, normalized),
  };
}

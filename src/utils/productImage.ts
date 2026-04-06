import { publicImageUrl } from "@/utils/storage";

const INVALID_TERMS = [
  "placeholder", "default", "fallback", "banner", "cover",
  "render", "house", "background", "hero", "slide",
];

/**
 * Returns the first valid product image path, filtering out generic/invalid ones.
 * Returns null if no valid image exists.
 */
export function getValidProductImagePath(
  images: Array<{ path: string | null }> | undefined | null,
): string | null {
  if (!images || images.length === 0) return null;

  const valid = images.find((img) => {
    if (!img?.path) return false;
    const lower = img.path.toLowerCase();
    return !INVALID_TERMS.some((t) => lower.includes(t));
  });

  return valid?.path ?? null;
}

/**
 * Returns a public URL for the best valid product image, or fallback.
 */
export function getProductImageUrl(
  images: Array<{ path: string | null }> | undefined | null,
  fallback = "/placeholder.svg",
): string {
  const path = getValidProductImagePath(images);
  if (!path) return fallback;
  return publicImageUrl("product-images", path) || fallback;
}

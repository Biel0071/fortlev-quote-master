import { publicImageUrl } from "@/utils/storage";
const INVALID_TERMS = [
  "background", "hero", "fallback", "placeholder"
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
    const path = String(img.path).toLowerCase();
    return !INVALID_TERMS.some(term => path.includes(term));
  });

  return valid?.path ?? null;
}

/**
 * Sem foto real do produto: usa placeholder neutro (nunca uma imagem inventada).
 * As fotos reais vêm do storage `product-images` via `images[].path`.
 */
export function resolveProductFallbackImage(_name?: string | null, _category?: string | null): string {
  return "/placeholder.svg";
}
/**
 * Returns a public URL for the best valid product image, or contextual fallback.
 */
export function getProductImageUrl(
  images: Array<{ path: string | null }> | undefined | null,
  fallback = "/placeholder.svg",
  productContext?: { name?: string | null; category?: string | null },
): string {
  const path = getValidProductImagePath(images);
  if (!path) {
    if (productContext && (productContext.name || productContext.category)) {
      return resolveProductFallbackImage(productContext.name, productContext.category);
    }
    return fallback;
  }
  return publicImageUrl("product-images", path) || fallback;
}

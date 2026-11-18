type PricedStoreProduct = {
  price?: number | string | null;
  promo_price?: number | string | null;
} | null | undefined;

export function resolveVerifiedCartPrice(product: PricedStoreProduct): number | null {
  if (!product) return null;

  const price = Number(product.price ?? 0);
  if (!Number.isFinite(price) || price <= 0) return null;

  const promoPrice = Number(product.promo_price ?? 0);
  return Number.isFinite(promoPrice) && promoPrice > 0 && promoPrice < price ? promoPrice : price;
}

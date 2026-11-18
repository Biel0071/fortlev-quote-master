import { useMemo } from "react";

export type OfferProduct = {
  id: string;
  name: string;
  price: number;
  promo_price: number;
  discountPct: number;
  unit: string;
  images: Array<{ path: string | null }>;
  active: boolean;
  _isOffer: true;
  best_seller?: boolean;
  featured?: boolean;
  category?: string | null;
  description?: string | null;
};

export function selectRealOfferProducts(products: any[]): OfferProduct[] {
  return (products ?? [])
    .filter((product) => {
      const price = Number(product?.price);
      const promoPrice = Number(product?.promo_price);
      return product?.id && product?.active !== false && product?.is_promotion === true &&
        Number.isFinite(price) && Number.isFinite(promoPrice) && promoPrice > 0 && promoPrice < price;
    })
    .map((product) => {
      const price = Number(product.price);
      const promoPrice = Number(product.promo_price);
      return {
        ...product,
        id: String(product.id),
        price,
        promo_price: promoPrice,
        discountPct: Math.round(((price - promoPrice) / price) * 100),
        unit: product.unit ?? "un",
        images: Array.isArray(product.images) ? product.images : [],
        active: true,
        _isOffer: true as const,
      };
    });
}

export function useOfferProducts(activeProducts: any[]): { offerProducts: OfferProduct[] } {
  const offerProducts = useMemo(() => selectRealOfferProducts(activeProducts), [activeProducts]);
  return { offerProducts };
}

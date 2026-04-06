import { useMemo } from "react";
import { normalizeText } from "@/utils/normalize";

const OFFER_SEEDS: Array<{
  searchTerms: string[];
}> = [
  { searchTerms: ["caixa d agua 3000", "caixa dagua 3000", "reservatorio 3000"] },
  { searchTerms: ["tijolo 12 furos"] },
  { searchTerms: ["tijolo 9 furos"] },
  { searchTerms: ["tijolo 8 furos"] },
  { searchTerms: ["telha", "telhas"] },
  { searchTerms: ["kmr 10000", "kmr 10.000"] },
  { searchTerms: ["fortlev 5000"] },
  { searchTerms: ["fortlev 2000"] },
  { searchTerms: ["fortlev 1000"] },
  { searchTerms: ["nacional cp4", "cp iv", "cp4"] },
  { searchTerms: ["liz cp4"] },
  { searchTerms: ["liz cp2"] },
  { searchTerms: ["churrasqueira trio"] },
  { searchTerms: ["caminhao brita 9", "caminhão brita"] },
  { searchTerms: ["brita m3", "brita metro"] },
  { searchTerms: ["bloco 20"] },
  { searchTerms: ["bloco 15"] },
  { searchTerms: ["bloco 10"] },
  { searchTerms: ["betoneira csm 400", "betoneira 400"] },
  { searchTerms: ["ac3", "ac 3", "argamassa ac3"] },
  { searchTerms: ["ac2", "ac 2", "argamassa ac2"] },
  { searchTerms: ["ac1", "ac 1", "argamassa ac1"] },
  { searchTerms: ["caminhao areia 9", "caminhão areia"] },
  { searchTerms: ["areia m3", "areia metro"] },
];

/** Deterministic markup based on product name hash — between 15% and 35% */
function deterministicMarkup(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 2001) / 2000; // 0..1
  return 0.15 + normalized * 0.20; // 15% to 35%
}

function fuzzyMatch(productName: string, terms: string[]): boolean {
  const norm = normalizeText(productName);
  return terms.some((t) => norm.includes(normalizeText(t)));
}

function fuzzyScore(productName: string, terms: string[]): number {
  const norm = normalizeText(productName);
  return terms.reduce((score, term) => {
    const normalizedTerm = normalizeText(term);
    if (norm === normalizedTerm) return score + 20;
    if (norm.startsWith(normalizedTerm)) return score + 12;
    if (norm.includes(normalizedTerm)) return score + 8;
    return score;
  }, 0);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function resolveOfferPricing(product: any) {
  const currentPrice = Number(product?.price ?? 0);
  const promoPrice = Number(product?.promo_price ?? 0);
  const storedDiscount = Number(product?.discount_percentage ?? 0);

  if (promoPrice > 0 && currentPrice > 0 && promoPrice < currentPrice) {
    return {
      originalPrice: roundMoney(currentPrice),
      promoPrice: roundMoney(promoPrice),
      discountPct: Math.max(1, Math.round(((currentPrice - promoPrice) / currentPrice) * 100)),
    };
  }

  if (currentPrice <= 0) return null;

  if (Boolean(product?.is_promotion) || storedDiscount > 0) {
    const markup = storedDiscount > 0
      ? Math.max(0.15, Math.min(0.35, storedDiscount / 100))
      : deterministicMarkup(product?.name ?? "produto");
    const originalPrice = roundMoney(currentPrice * (1 + markup));
    const discountPct = Math.max(1, Math.round(((originalPrice - currentPrice) / originalPrice) * 100));

    return {
      originalPrice,
      promoPrice: roundMoney(currentPrice),
      discountPct,
    };
  }

  return null;
}

export type OfferProduct = {
  id: string;
  name: string;
  price: number;       // "de" price (with markup)
  promo_price: number;  // final promotional price
  discountPct: number;
  unit: string;
  images: Array<{ path: string | null }>;
  active: boolean;
  _isOffer: true;
  // passthrough fields from real product
  best_seller?: boolean;
  featured?: boolean;
  category?: string | null;
  description?: string | null;
};

export function useOfferProducts(activeProducts: any[]): {
  offerProducts: OfferProduct[];
} {
  const offerProducts = useMemo(() => {
    const promotionPool = (activeProducts ?? [])
      .map((product: any) => {
        const pricing = resolveOfferPricing(product);
        return pricing ? { product, pricing } : null;
      })
      .filter(Boolean) as Array<{ product: any; pricing: NonNullable<ReturnType<typeof resolveOfferPricing>> }>;

    const usedIds = new Set<string>();

    const prioritized = OFFER_SEEDS.map((seed) => {
      const match = promotionPool
        .filter(({ product }) => !usedIds.has(product.id) && fuzzyMatch(product.name ?? "", seed.searchTerms))
        .sort((a, b) => {
          const scoreDiff = fuzzyScore(b.product.name ?? "", seed.searchTerms) - fuzzyScore(a.product.name ?? "", seed.searchTerms);
          if (scoreDiff !== 0) return scoreDiff;
          return b.pricing.discountPct - a.pricing.discountPct;
        })[0];

      if (!match) return null;

      usedIds.add(match.product.id);

      return {
        ...match.product,
        id: match.product.id,
        name: match.product.name,
        price: match.pricing.originalPrice,
        promo_price: match.pricing.promoPrice,
        discountPct: match.pricing.discountPct,
        unit: match.product.unit ?? "un",
        images: match.product.images ?? [],
        active: Boolean(match.product.active),
        _isOffer: true as const,
        best_seller: match.product.best_seller,
        featured: match.product.featured,
        category: match.product.category,
        description: match.product.description,
      };
    }).filter(Boolean) as OfferProduct[];

    const remainingPromotions = promotionPool
      .filter(({ product }) => !usedIds.has(product.id))
      .sort((a, b) => {
        const discountDiff = b.pricing.discountPct - a.pricing.discountPct;
        if (discountDiff !== 0) return discountDiff;
        const sellerDiff = Number(b.product.best_seller ?? false) - Number(a.product.best_seller ?? false);
        if (sellerDiff !== 0) return sellerDiff;
        const featuredDiff = Number(b.product.featured ?? false) - Number(a.product.featured ?? false);
        if (featuredDiff !== 0) return featuredDiff;
        return Number(b.product.sales ?? 0) - Number(a.product.sales ?? 0);
      })
      .map(({ product, pricing }) => ({
        ...product,
        id: product.id,
        name: product.name,
        price: pricing.originalPrice,
        promo_price: pricing.promoPrice,
        discountPct: pricing.discountPct,
        unit: product.unit ?? "un",
        images: product.images ?? [],
        active: Boolean(product.active),
        _isOffer: true as const,
        best_seller: product.best_seller,
        featured: product.featured,
        category: product.category,
        description: product.description,
      }));

    if (prioritized.length > 0 || remainingPromotions.length > 0) {
      return [...prioritized, ...remainingPromotions].slice(0, 24);
    }

    return (activeProducts ?? [])
      .filter((product: any) => Number(product?.price ?? 0) > 0)
      .sort((a: any, b: any) => {
        const sellerDiff = Number(b.best_seller ?? false) - Number(a.best_seller ?? false);
        if (sellerDiff !== 0) return sellerDiff;
        const featuredDiff = Number(b.featured ?? false) - Number(a.featured ?? false);
        if (featuredDiff !== 0) return featuredDiff;
        return Number(b.sales ?? 0) - Number(a.sales ?? 0);
      })
      .slice(0, 24)
      .map((product: any) => {
        const markup = deterministicMarkup(product?.name ?? "produto");
        const promoPrice = roundMoney(Number(product?.price ?? 0));
        const originalPrice = roundMoney(promoPrice * (1 + markup));
        return {
          ...product,
          id: product.id,
          name: product.name,
          price: originalPrice,
          promo_price: promoPrice,
          discountPct: Math.max(1, Math.round(((originalPrice - promoPrice) / originalPrice) * 100)),
          unit: product.unit ?? "un",
          images: product.images ?? [],
          active: Boolean(product.active),
          _isOffer: true as const,
          best_seller: product.best_seller,
          featured: product.featured,
          category: product.category,
          description: product.description,
        };
      });
  }, [activeProducts]);

  return { offerProducts };
}

import { useMemo } from "react";
import { normalizeText } from "@/utils/normalize";

const OFFER_SEEDS: Array<{
  searchTerms: string[];
  promoPrice: number;
  originalPrice: number;
}> = [
  // 🟦 Caixas d'água / Reservatórios
  { searchTerms: ["caixa d agua 3000", "caixa dagua 3000", "reservatorio 3000"], promoPrice: 849, originalPrice: 1079 },
  { searchTerms: ["fortlev 1000"], promoPrice: 279.90, originalPrice: 349 },
  { searchTerms: ["fortlev 2000"], promoPrice: 489.99, originalPrice: 649 },
  { searchTerms: ["fortlev 5000"], promoPrice: 1985.89, originalPrice: 2480 },
  { searchTerms: ["kmr 10000", "kmr 10.000"], promoPrice: 3389, originalPrice: 4400 },
  // 🧱 Tijolos / Blocos
  { searchTerms: ["tijolo 12 furos"], promoPrice: 1020, originalPrice: 1300 },
  { searchTerms: ["tijolo 9 furos"], promoPrice: 950, originalPrice: 1200 },
  { searchTerms: ["tijolo 8 furos"], promoPrice: 880, originalPrice: 1150 },
  { searchTerms: ["bloco 20"], promoPrice: 2200, originalPrice: 2860 },
  { searchTerms: ["bloco 15"], promoPrice: 1700, originalPrice: 2200 },
  { searchTerms: ["bloco 10"], promoPrice: 1300, originalPrice: 1700 },
  // 🏗️ Materiais
  { searchTerms: ["caminhao areia 9", "caminhão areia"], promoPrice: 780, originalPrice: 1020 },
  { searchTerms: ["areia m3", "areia metro"], promoPrice: 109.90, originalPrice: 139.90 },
  { searchTerms: ["caminhao brita 9", "caminhão brita"], promoPrice: 1050, originalPrice: 1350 },
  { searchTerms: ["brita m3", "brita metro"], promoPrice: 140, originalPrice: 179 },
  // 🧱 Cimentos
  { searchTerms: ["nacional cp4", "cp iv", "cp4"], promoPrice: 24, originalPrice: 31 },
  { searchTerms: ["liz cp4"], promoPrice: 23.90, originalPrice: 30 },
  { searchTerms: ["liz cp2"], promoPrice: 22.40, originalPrice: 28.90 },
  // 🔥 Outros
  { searchTerms: ["churrasqueira trio"], promoPrice: 1089.90, originalPrice: 1390 },
  { searchTerms: ["betoneira csm 400", "betoneira 400"], promoPrice: 2999, originalPrice: 3900 },
  // 🧪 Aditivos
  { searchTerms: ["ac1", "ac 1", "argamassa ac1"], promoPrice: 14.80, originalPrice: 18.90 },
  { searchTerms: ["ac2", "ac 2", "argamassa ac2"], promoPrice: 17.30, originalPrice: 22 },
  { searchTerms: ["ac3", "ac 3", "argamassa ac3"], promoPrice: 19.90, originalPrice: 25 },
];

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

/** Deterministic markup based on product name hash — between 15% and 35% */
function deterministicMarkup(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 2001) / 2000;
  return 0.15 + normalized * 0.20;
}

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

export function useOfferProducts(activeProducts: any[]): {
  offerProducts: OfferProduct[];
} {
  const offerProducts = useMemo(() => {
    const usedIds = new Set<string>();

    // 1) Match seeds to real products with fixed pricing
    const prioritized = OFFER_SEEDS.map((seed) => {
      const match = (activeProducts ?? [])
        .filter((p: any) => !usedIds.has(p.id) && Number(p?.price ?? 0) > 0 && fuzzyMatch(p.name ?? "", seed.searchTerms))
        .sort((a: any, b: any) => fuzzyScore(b.name ?? "", seed.searchTerms) - fuzzyScore(a.name ?? "", seed.searchTerms))[0];

      if (!match) return null;
      usedIds.add(match.id);

      const discountPct = Math.max(1, Math.round(((seed.originalPrice - seed.promoPrice) / seed.originalPrice) * 100));

      return {
        ...match,
        id: match.id,
        name: match.name,
        price: roundMoney(seed.originalPrice),
        promo_price: roundMoney(seed.promoPrice),
        discountPct,
        unit: match.unit ?? "un",
        images: match.images ?? [],
        active: Boolean(match.active),
        _isOffer: true as const,
        best_seller: match.best_seller,
        featured: match.featured,
        category: match.category,
        description: match.description,
      };
    }).filter(Boolean) as OfferProduct[];

    // 2) Fill remaining slots with other promotional products
    const remaining = (activeProducts ?? [])
      .filter((p: any) => {
        if (usedIds.has(p.id)) return false;
        const price = Number(p?.price ?? 0);
        const promo = Number(p?.promo_price ?? 0);
        return price > 0 && promo > 0 && promo < price;
      })
      .sort((a: any, b: any) => {
        const dA = Math.round(((Number(a.price) - Number(a.promo_price)) / Number(a.price)) * 100);
        const dB = Math.round(((Number(b.price) - Number(b.promo_price)) / Number(b.price)) * 100);
        if (dB !== dA) return dB - dA;
        return Number(b.sales ?? 0) - Number(a.sales ?? 0);
      })
      .slice(0, 24 - prioritized.length)
      .map((p: any) => {
        const price = Number(p.price);
        const promo = Number(p.promo_price);
        return {
          ...p,
          id: p.id,
          name: p.name,
          price: roundMoney(price),
          promo_price: roundMoney(promo),
          discountPct: Math.max(1, Math.round(((price - promo) / price) * 100)),
          unit: p.unit ?? "un",
          images: p.images ?? [],
          active: Boolean(p.active),
          _isOffer: true as const,
          best_seller: p.best_seller,
          featured: p.featured,
          category: p.category,
          description: p.description,
        };
      });

    // Only return seed-matched and real promo products — no fallback
    return [...prioritized, ...remaining];
  }, [activeProducts]);

  return { offerProducts };
}

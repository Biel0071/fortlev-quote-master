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

const OFFER_PRODUCTS = [
  "caixa dagua 3000",
  "caixa d agua 3000",
  "fortlev 1000",
  "fortlev 2000",
  "fortlev 5000",
  "kmr 10000",
  "kmr 10.000",
  "tijolo 12 furos",
  "tijolo 9 furos",
  "tijolo 8 furos",
  "bloco 20",
  "bloco 15",
  "bloco 10",
  "caminhao areia",
  "caminhao de areia",
  "areia m3",
  "areia metro",
  "caminhao brita",
  "caminhao de brita",
  "brita m3",
  "brita metro",
  "nacional cp4",
  "cimento cp4",
  "liz cp4",
  "liz cp2",
  "churrasqueira trio",
  "betoneira 400",
  "ac1",
  "ac2",
  "ac3",
];

function fuzzyMatch(productName: string, terms: string[]): boolean {
  const norm = normalizeText(productName);
  return terms.some((t) => norm.includes(normalizeText(t)));
}

function isAllowedOfferProduct(productName: string): boolean {
  const norm = normalizeText(productName);
  return OFFER_PRODUCTS.some((name) => norm.includes(normalizeText(name)));
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
        .filter((p: any) =>
          !usedIds.has(p.id)
          && Number(p?.price ?? 0) > 0
          && isAllowedOfferProduct(p.name ?? "")
          && fuzzyMatch(p.name ?? "", seed.searchTerms)
        )
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

    return prioritized;
  }, [activeProducts]);

  return { offerProducts };
}

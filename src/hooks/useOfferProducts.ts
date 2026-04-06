import { useMemo } from "react";
import { normalizeText } from "@/utils/normalize";

/** Hardcoded offer catalog — promo_price is the FINAL price the customer pays */
const OFFER_SEEDS: Array<{
  searchTerms: string[];
  promoPrice: number;
  unit: string;
  fallbackName: string;
}> = [
  { searchTerms: ["caixa d agua 3000", "caixa dagua 3000", "reservatorio 3000"], promoPrice: 849, unit: "un", fallbackName: "Caixa d'Água 3000L" },
  { searchTerms: ["tijolo 12 furos"], promoPrice: 1020, unit: "mil", fallbackName: "Tijolo 12 Furos (milheiro)" },
  { searchTerms: ["tijolo 9 furos"], promoPrice: 950, unit: "mil", fallbackName: "Tijolo 9 Furos (milheiro)" },
  { searchTerms: ["tijolo 8 furos"], promoPrice: 880, unit: "mil", fallbackName: "Tijolo 8 Furos (milheiro)" },
  { searchTerms: ["telha", "telhas"], promoPrice: 249, unit: "mil", fallbackName: "Telhas (milheiro)" },
  { searchTerms: ["kmr 10000", "kmr 10.000"], promoPrice: 3389, unit: "un", fallbackName: "KMR 10000L" },
  { searchTerms: ["fortlev 5000"], promoPrice: 1985.89, unit: "un", fallbackName: "Caixa d'Água 5000L Fortlev" },
  { searchTerms: ["fortlev 2000"], promoPrice: 489.99, unit: "un", fallbackName: "Caixa d'Água 2000L Fortlev" },
  { searchTerms: ["fortlev 1000"], promoPrice: 279.90, unit: "un", fallbackName: "Caixa d'Água 1000L Fortlev" },
  { searchTerms: ["nacional cp4", "cp iv", "cp4"], promoPrice: 24, unit: "sc", fallbackName: "Cimento Nacional CP4" },
  { searchTerms: ["liz cp4"], promoPrice: 23.90, unit: "sc", fallbackName: "Cimento Liz CP4" },
  { searchTerms: ["liz cp2"], promoPrice: 22.40, unit: "sc", fallbackName: "Cimento Liz CP2" },
  { searchTerms: ["churrasqueira trio"], promoPrice: 1089.90, unit: "un", fallbackName: "Churrasqueira Trio" },
  { searchTerms: ["caminhao brita 9", "caminhão brita"], promoPrice: 1050, unit: "cam", fallbackName: "Caminhão de Brita 9m³" },
  { searchTerms: ["brita m3", "brita metro"], promoPrice: 140, unit: "m³", fallbackName: "Brita m³" },
  { searchTerms: ["bloco 20"], promoPrice: 2200, unit: "mil", fallbackName: "Bloco 20 (1000 un)" },
  { searchTerms: ["bloco 15"], promoPrice: 1700, unit: "mil", fallbackName: "Bloco 15 (1000 un)" },
  { searchTerms: ["bloco 10"], promoPrice: 1300, unit: "mil", fallbackName: "Bloco 10 (1000 un)" },
  { searchTerms: ["betoneira csm 400", "betoneira 400"], promoPrice: 2999, unit: "un", fallbackName: "Betoneira CSM 400L" },
  { searchTerms: ["ac3", "ac 3", "argamassa ac3"], promoPrice: 19.90, unit: "sc", fallbackName: "Argamassa AC3" },
  { searchTerms: ["ac2", "ac 2", "argamassa ac2"], promoPrice: 17.30, unit: "sc", fallbackName: "Argamassa AC2" },
  { searchTerms: ["ac1", "ac 1", "argamassa ac1"], promoPrice: 14.80, unit: "sc", fallbackName: "Argamassa AC1" },
  { searchTerms: ["caminhao areia 9", "caminhão areia"], promoPrice: 780, unit: "cam", fallbackName: "Caminhão de Areia 9m³" },
  { searchTerms: ["areia m3", "areia metro"], promoPrice: 109.90, unit: "m³", fallbackName: "Areia m³" },
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

/** Deterministic simulated rating based on product name hash */
function deterministicRating(name: string): { avg: number; total: number } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash);
  const avg = 4.2 + ((abs % 8) / 10); // 4.2 to 4.9
  const total = 30 + (abs % 671); // 30 to 700
  return { avg: Math.round(avg * 10) / 10, total };
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
  rating: { avg: number; total: number };
  // passthrough fields from real product
  best_seller?: boolean;
  category?: string | null;
  description?: string | null;
};

/**
 * Matches the hardcoded offer seeds against real store products.
 * Always returns at least the fallback list — never empty.
 */
export function useOfferProducts(activeProducts: any[]): {
  offerProducts: OfferProduct[];
} {
  const offerProducts = useMemo(() => {
    const result: OfferProduct[] = [];
    const usedIds = new Set<string>();

    for (const seed of OFFER_SEEDS) {
      // Try to find a matching real product
      const match = activeProducts.find(
        (p: any) =>
          !usedIds.has(p.id) && fuzzyMatch(p.name ?? "", seed.searchTerms),
      );

      const promoPrice = seed.promoPrice;
      const markup = match
        ? deterministicMarkup(match.name ?? seed.fallbackName)
        : deterministicMarkup(seed.fallbackName);
      const originalPrice = Math.round(promoPrice * (1 + markup) * 100) / 100;
      const discountPct = Math.round(((originalPrice - promoPrice) / originalPrice) * 100);

      if (match) {
        usedIds.add(match.id);
        result.push({
          id: match.id,
          name: match.name,
          price: originalPrice,
          promo_price: promoPrice,
          discountPct,
          unit: match.unit ?? seed.unit,
          images: match.images ?? [],
          active: true,
          _isOffer: true,
          rating: deterministicRating(match.name ?? seed.fallbackName),
          best_seller: match.best_seller,
          category: match.category,
          description: match.description,
        });
      } else {
        // Fallback — synthetic product
        result.push({
          id: `offer_fb_${normalizeText(seed.fallbackName).replace(/\s+/g, "_")}`,
          name: seed.fallbackName,
          price: originalPrice,
          promo_price: promoPrice,
          discountPct,
          unit: seed.unit,
          images: [],
          active: true,
          _isOffer: true,
          rating: deterministicRating(seed.fallbackName),
        });
      }
    }

    // Sort by discount percentage descending
    return result.sort((a, b) => b.discountPct - a.discountPct);
  }, [activeProducts]);

  return { offerProducts };
}

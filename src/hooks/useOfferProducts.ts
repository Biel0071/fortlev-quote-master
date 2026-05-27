import { useMemo } from "react";
import { normalizeText } from "@/utils/normalize";

type OfferSeed = {
  name: string;
  searchTerms: string[];
  promoPrice: number;
  category?: string | null;
  unit?: string;
};

const OFFER_SEEDS: OfferSeed[] = [
  { name: "Caixa d'água 3000L", searchTerms: ["caixa dagua 3000", "caixa d agua 3000", "fortlev 3000", "1000l fortlev 3000"], promoPrice: 849, category: "Caixas d'água" },
  { name: "Fortlev 1000L", searchTerms: ["fortlev 1000", "1000l fortlev", "caixa dagua 1000 fortlev"], promoPrice: 279.9, category: "Caixas d'água" },
  { name: "Fortlev 2000L", searchTerms: ["fortlev 2000", "2000l fortlev", "caixa dagua 2000 fortlev"], promoPrice: 489.99, category: "Caixas d'água" },
  { name: "Fortlev 5000L", searchTerms: ["fortlev 5000", "5000l fortlev", "caixa dagua 5000 fortlev"], promoPrice: 1985.89, category: "Caixas d'água" },
  { name: "KMR 10000L", searchTerms: ["kmr 10000", "kmr 10.000", "10000l kmr", "caixa dagua 10000 kmr"], promoPrice: 3389, category: "Caixas d'água" },
  { name: "Tijolo 12 furos", searchTerms: ["tijolo 12 furos", "tijolo 12x19x29", "meio tijolo 14x19x29"], promoPrice: 1020, category: "Tijolos", unit: "milheiro" },
  { name: "Tijolo 9 furos", searchTerms: ["tijolo 9 furos", "tijolo 11 5x19x24", "meio tijolo 11 5x11 5x24"], promoPrice: 950, category: "Tijolos", unit: "milheiro" },
  { name: "Tijolo 8 furos", searchTerms: ["tijolo 8 furos", "tijolo 8"], promoPrice: 880, category: "Tijolos", unit: "milheiro" },
  { name: "Bloco 20", searchTerms: ["bloco 20", "bloco vedacao 020", "bloco 19x19x39"], promoPrice: 2200, category: "Blocos", unit: "milheiro" },
  { name: "Bloco 15", searchTerms: ["bloco 15", "bloco 15 cm"], promoPrice: 1700, category: "Blocos", unit: "milheiro" },
  { name: "Bloco 10", searchTerms: ["bloco 10", "bloco vazado 010", "bloco concreto celular 10"], promoPrice: 1300, category: "Blocos", unit: "milheiro" },
  { name: "Cimento CP4", searchTerms: ["nacional cp4", "cimento cp4", "cimento cpiv", "cpiv 50kg"], promoPrice: 24, category: "Cimentos", unit: "sc" },
  { name: "Liz CP4", searchTerms: ["liz cp4", "cimento liz cpiv"], promoPrice: 23.9, category: "Cimentos", unit: "sc" },
  { name: "Liz CP2", searchTerms: ["liz cp2", "cimento liz cpii", "cpii e 32"], promoPrice: 22.4, category: "Cimentos", unit: "sc" },
  { name: "Areia M³", searchTerms: ["areia m3", "areia grossa", "areia media", "areia"], promoPrice: 109.9, category: "Agregados", unit: "m³" },
  { name: "Brita M³", searchTerms: ["brita m3", "brita 0", "brita"], promoPrice: 140, category: "Agregados", unit: "m³" },
  { name: "Caminhão de Areia", searchTerms: ["caminhao areia", "caminhao de areia", "areia granel"], promoPrice: 780, category: "Agregados" },
  { name: "Caminhão de Brita", searchTerms: ["caminhao brita", "caminhao de brita", "brita granel"], promoPrice: 1050, category: "Agregados" },
  { name: "Betoneira 400L", searchTerms: ["betoneira 400", "betoneira 400l", "betoneira csm 400"], promoPrice: 2999, category: "Equipamentos" },
  { name: "Churrasqueira Trio", searchTerms: ["churrasqueira trio", "churrasqueira"], promoPrice: 1089.9, category: "Lazer" },
  { name: "AC1", searchTerms: ["ac1", "ac 1", "argamassa aci", "argamassa ac1"], promoPrice: 14.8, category: "Argamassa", unit: "sc" },
  { name: "AC2", searchTerms: ["ac2", "ac 2", "argamassa acii", "argamassa ac2"], promoPrice: 17.3, category: "Argamassa", unit: "sc" },
  { name: "AC3", searchTerms: ["ac3", "ac 3", "argamassa aciii", "argamassa ac3"], promoPrice: 19.9, category: "Argamassa", unit: "sc" },
];

const OFFER_STOP_WORDS = new Set([
  "a", "o", "de", "da", "do", "das", "dos", "e", "em", "para", "com", "sem", "l", "kg", "lts", "litros",
]);

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function compactOfferText(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

function tokenizeOfferText(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !OFFER_STOP_WORDS.has(token));
}

function extractNumbers(value: string) {
  return (normalizeText(value).match(/\d+/g) ?? []).map((token) => Number(token));
}

function deterministicMarkup(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 2001) / 2000;
  return 0.15 + normalized * 0.2;
}

function buildOriginalPrice(seed: OfferSeed) {
  return roundMoney(seed.promoPrice / (1 - deterministicMarkup(seed.name)));
}

function scoreOfferTerm(productName: string, term: string) {
  const productNorm = normalizeText(productName);
  const productCompact = compactOfferText(productName);
  const termNorm = normalizeText(term);
  const termCompact = compactOfferText(term);

  if (!productNorm || !termNorm) return 0;

  let score = 0;

  if (productNorm === termNorm) score += 320;
  if (productNorm.includes(termNorm)) score += 180;
  if (termCompact && productCompact.includes(termCompact)) score += 140;

  const productTokens = tokenizeOfferText(productNorm);
  const termTokens = tokenizeOfferText(termNorm);

  let exactHits = 0;
  let partialHits = 0;

  for (const token of termTokens) {
    if (productTokens.includes(token) || productCompact.includes(token)) {
      exactHits += 1;
      continue;
    }

    if (productTokens.some((productToken) => productToken.startsWith(token) || token.startsWith(productToken))) {
      partialHits += 1;
    }
  }

  score += exactHits * 28;
  score += partialHits * 12;

  if (termTokens.length > 0 && exactHits === termTokens.length) score += 60;
  if (termTokens.length > 0 && exactHits + partialHits === termTokens.length) score += 25;

  const productNumbers = extractNumbers(productNorm);
  const termNumbers = extractNumbers(termNorm);

  for (const termNumber of termNumbers) {
    const minDelta = productNumbers.reduce<number>((smallest, productNumber) => {
      return Math.min(smallest, Math.abs(productNumber - termNumber));
    }, Number.POSITIVE_INFINITY);

    if (!Number.isFinite(minDelta)) continue;
    if (minDelta === 0) score += 34;
    else if (minDelta === 1) score += 20;
    else if (minDelta === 2) score += 10;
  }

  return score;
}

function scoreOfferProduct(product: any, seed: OfferSeed) {
  return Math.max(0, ...[seed.name, ...seed.searchTerms].map((term) => scoreOfferTerm(product?.name ?? "", term)));
}

function getBestOfferMatch(products: any[], seed: OfferSeed, usedIds: Set<string>, minimumScore: number) {
  const best = (products ?? [])
    .filter((product: any) => product?.id && !usedIds.has(product.id))
    .map((product: any) => ({ product, score: scoreOfferProduct(product, seed) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.product?.name ?? "").localeCompare(String(b.product?.name ?? ""));
    })[0];

  if (!best || best.score < minimumScore) return null;
  return best.product;
}

function createMockOffer(seed: OfferSeed): OfferProduct {
  const originalPrice = buildOriginalPrice(seed);
  return {
    id: `mock-${compactOfferText(seed.name) || "offer"}`,
    name: seed.name,
    price: originalPrice,
    promo_price: roundMoney(seed.promoPrice),
    discountPct: Math.max(1, Math.round(((originalPrice - seed.promoPrice) / originalPrice) * 100)),
    unit: seed.unit ?? "un",
    images: [{ path: null }],
    active: true,
    _isOffer: true,
    category: seed.category ?? null,
    description: null,
    isMock: true,
    matchType: "mock",
  };
}

function buildOfferProduct(seed: OfferSeed, product: any, matchType: OfferProduct["matchType"]): OfferProduct {
  if (!product) return createMockOffer(seed);

  const originalPrice = buildOriginalPrice(seed);

  return {
    ...product,
    id: String(product.id),
    name: seed.name,
    price: originalPrice,
    promo_price: roundMoney(seed.promoPrice),
    discountPct: Math.max(1, Math.round(((originalPrice - seed.promoPrice) / originalPrice) * 100)),
    unit: product.unit ?? seed.unit ?? "un",
    images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [{ path: null }],
    active: Boolean(product.active ?? true),
    _isOffer: true,
    best_seller: Boolean(product.best_seller),
    featured: Boolean(product.featured),
    category: product.category ?? seed.category ?? null,
    description: product.description ?? null,
    isMock: false,
    matchType,
  };
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
  isMock?: boolean;
  matchType?: "direct" | "similar" | "mock";
};

export function useOfferProducts(activeProducts: any[]): {
  offerProducts: OfferProduct[];
} {
  const offerProducts = useMemo(() => {
    if (!activeProducts || activeProducts.length === 0) {
      return OFFER_SEEDS.map(createMockOffer);
    }

    const usedIds = new Set<string>();
    
    // Pre-calculate normalized names to speed up matching
    const productsWithNorm = activeProducts.map(p => ({
      p,
      norm: normalizeText(p.name || ""),
      compact: compactOfferText(p.name || "")
    }));

    return OFFER_SEEDS.map((seed) => {
      // Optimization: Try to find a direct match quickly first
      const directMatch = productsWithNorm.find(item => 
        !usedIds.has(item.p.id) && 
        (item.norm === normalizeText(seed.name) || seed.searchTerms.some(st => item.norm === normalizeText(st)))
      );

      if (directMatch) {
        usedIds.add(directMatch.p.id);
        return buildOfferProduct(seed, directMatch.p, "direct");
      }

      const directProduct = getBestOfferMatch(activeProducts, seed, usedIds, 120);
      if (directProduct) {
        usedIds.add(directProduct.id);
        return buildOfferProduct(seed, directProduct, "direct");
      }

      const similarProduct = getBestOfferMatch(activeProducts, seed, usedIds, 48);
      if (similarProduct) {
        usedIds.add(similarProduct.id);
        return buildOfferProduct(seed, similarProduct, "similar");
      }

      return createMockOffer(seed);
    });
  }, [activeProducts]);

  return { offerProducts };
}

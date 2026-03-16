import { normalizeText } from "@/utils/normalize";

// ──────────────────────────────────────────────
// 1. CATEGORY DETECTION
// ──────────────────────────────────────────────

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["caixa d'agua", "caixa d\u2019agua", "caixa dagua"], category: "caixa dagua" },
  { keywords: ["caixa sifonada"], category: "caixa sifonada" },
  { keywords: ["caixa eletrica"], category: "caixa eletrica" },
  { keywords: ["cabo eletrico", "cabo flexivel"], category: "cabo eletrico" },
  { keywords: ["vaso sanitario"], category: "vaso sanitario" },
  { keywords: ["porcelanato"], category: "porcelanato" },
  { keywords: ["revestimento"], category: "revestimento" },
  { keywords: ["impermeabilizante"], category: "impermeabilizante" },
  { keywords: ["argamassa"], category: "argamassa" },
  { keywords: ["vergalhao", "vergalhão"], category: "vergalhao" },
  { keywords: ["cimento"], category: "cimento" },
  { keywords: ["areia"], category: "areia" },
  { keywords: ["brita"], category: "brita" },
  { keywords: ["bloco"], category: "bloco" },
  { keywords: ["tijolo"], category: "tijolo" },
  { keywords: ["telha"], category: "telha" },
  { keywords: ["piso"], category: "piso" },
  { keywords: ["ferro"], category: "ferro" },
  { keywords: ["fio"], category: "fio" },
  { keywords: ["tubo"], category: "tubo" },
  { keywords: ["cano"], category: "cano" },
  { keywords: ["registro"], category: "registro" },
  { keywords: ["torneira"], category: "torneira" },
  { keywords: ["tinta"], category: "tinta" },
  { keywords: ["conduite"], category: "conduite" },
  { keywords: ["gesso"], category: "gesso" },
  { keywords: ["argila"], category: "argila" },
  { keywords: ["porta"], category: "porta" },
  { keywords: ["janela"], category: "janela" },
  { keywords: ["madeira"], category: "madeira" },
  { keywords: ["prego"], category: "prego" },
  { keywords: ["parafuso"], category: "parafuso" },
  { keywords: ["arame"], category: "arame" },
  { keywords: ["manta"], category: "manta" },
  { keywords: ["chuveiro"], category: "chuveiro" },
  { keywords: ["ralo"], category: "ralo" },
];

export function detectCategory(name: string): string | null {
  const hay = normalizeText(name);
  for (const entry of CATEGORY_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (hay.includes(normalizeText(kw))) return entry.category;
    }
  }
  return null;
}

// ──────────────────────────────────────────────
// 2. UNIT DETECTION
// ──────────────────────────────────────────────

const UNIT_RULES: Array<{ patterns: string[]; unit: string }> = [
  { patterns: ["milheiro", "1000 unidades", "1000 un"], unit: "milheiro" },
  { patterns: ["m²", "m2"], unit: "m2" },
  { patterns: ["m³", "m3", "metro cubico"], unit: "m3" },
  { patterns: ["caminhao", "caminhão"], unit: "caminhao" },
  { patterns: ["rolo"], unit: "rolo" },
  { patterns: ["galao", "galão"], unit: "galao" },
  { patterns: ["litro", "lt"], unit: "litro" },
  { patterns: ["barra", "12m", "vergalhao", "vergalhão"], unit: "barra" },
  { patterns: ["50kg", "20kg", "25kg", "40kg", "saco"], unit: "saco" },
  { patterns: ["kg", "quilo"], unit: "kg" },
  { patterns: ["metro", "ml"], unit: "metro" },
  { patterns: ["caixa", "cx"], unit: "caixa" },
];

const CATEGORY_DEFAULT_UNITS: Record<string, string> = {
  cimento: "saco",
  argamassa: "saco",
  areia: "m3",
  brita: "m3",
  bloco: "unidade",
  tijolo: "unidade",
  piso: "m2",
  porcelanato: "m2",
  revestimento: "m2",
  ferro: "barra",
  vergalhao: "barra",
  fio: "metro",
  "cabo eletrico": "metro",
  tubo: "unidade",
  cano: "unidade",
  telha: "unidade",
  tinta: "litro",
  "caixa dagua": "unidade",
  gesso: "saco",
  arame: "kg",
  prego: "kg",
  parafuso: "caixa",
  porta: "unidade",
  janela: "unidade",
  registro: "unidade",
  torneira: "unidade",
  chuveiro: "unidade",
  "vaso sanitario": "unidade",
  ralo: "unidade",
  "caixa sifonada": "unidade",
  impermeabilizante: "litro",
  manta: "rolo",
  conduite: "metro",
  "caixa eletrica": "unidade",
  argila: "saco",
  madeira: "metro",
};

export function detectUnit(name: string, category?: string | null): string {
  const hay = normalizeText(name);

  for (const rule of UNIT_RULES) {
    for (const pattern of rule.patterns) {
      if (hay.includes(normalizeText(pattern))) return rule.unit;
    }
  }

  if (category && CATEGORY_DEFAULT_UNITS[category]) {
    return CATEGORY_DEFAULT_UNITS[category];
  }

  return "unidade";
}

// ──────────────────────────────────────────────
// 3. PRICE VALIDATION & AUTO-CORRECTION
// ──────────────────────────────────────────────

export interface PriceRange {
  min: number;
  max: number;
  avg: number;
}

export interface PriceValidationResult {
  valid: boolean;
  confidence: number; // 0..1
  correctedPrice: number | null;
  error: "price_error" | "price_auto_corrected" | null;
  category: string | null;
  unit: string;
  range: PriceRange | null;
}

/**
 * Validate a product price against intelligence ranges.
 * @param price   numeric price value
 * @param name    product name
 * @param ranges  map of "categoria|unidade" → PriceRange (from DB or hardcoded)
 */
export function validateProductPrice(
  price: number | null,
  name: string,
  ranges: Map<string, PriceRange>
): PriceValidationResult {
  const category = detectCategory(name);
  const unit = detectUnit(name, category);
  const result: PriceValidationResult = {
    valid: true,
    confidence: 1.0,
    correctedPrice: null,
    error: null,
    category,
    unit,
    range: null,
  };

  if (price === null || price <= 0) {
    result.valid = false;
    result.confidence = 0;
    result.error = "price_error";
    return result;
  }

  if (!category) {
    // No category detected — can't validate, assume OK with medium confidence
    result.confidence = 0.5;
    return result;
  }

  const key = `${category}|${unit}`;
  const range = ranges.get(key);
  if (!range) {
    result.confidence = 0.5;
    return result;
  }

  result.range = range;

  if (price >= range.min && price <= range.max) {
    result.confidence = 1.0;
    return result;
  }

  // Try auto-correction: divide by 10, 100, 1000
  if (price > range.max) {
    for (const divisor of [10, 100, 1000]) {
      const corrected = Math.round((price / divisor) * 100) / 100;
      if (corrected >= range.min && corrected <= range.max) {
        result.valid = true;
        result.confidence = 0.7;
        result.correctedPrice = corrected;
        result.error = "price_auto_corrected";
        return result;
      }
    }
  }

  // Price is out of range and couldn't be auto-corrected
  result.valid = false;
  result.confidence = price < range.min ? 0.3 : 0.0;
  result.error = "price_error";
  return result;
}

// ──────────────────────────────────────────────
// 4. LEGACY HELPERS (kept for backwards compat)
// ──────────────────────────────────────────────

export function detectUnitByProductName(name: string, category?: string | null) {
  return detectUnit(name, category);
}

export function detectMaterial(productName: string) {
  const hay = normalizeText(productName ?? "");
  if (hay.includes("pvc")) return "PVC";
  if (hay.includes("aco") || hay.includes("aço")) return "Aço";
  if (hay.includes("ferro")) return "Ferro";
  if (hay.includes("cimento")) return "Cimento";
  if (hay.includes("plastico") || hay.includes("plástico")) return "Plástico";
  if (hay.includes("aluminio") || hay.includes("alumínio")) return "Alumínio";
  if (hay.includes("ceramica") || hay.includes("cerâmica")) return "Cerâmica";
  return "-";
}

export function detectWarrantyByProduct(productName: string, category?: string | null) {
  const hay = normalizeText(`${category ?? ""} ${productName ?? ""}`);
  if (hay.includes("ferrament")) return "3 meses";
  if (hay.includes("eletric") || hay.includes("el\u00e9tric")) return "6 meses";
  if (hay.includes("hidraulic") || hay.includes("hidr\u00e1ulic")) return "3 meses";
  if (hay.includes("caixa") && hay.includes("agua")) return "5 anos";
  if (hay.includes("telha")) return "5 anos";
  if (hay.includes("cimento")) return "sem garantia";
  if (hay.includes("estrutural") && (hay.includes("metal") || hay.includes("aco") || hay.includes("a\u00e7o"))) return "10 anos";
  return "3 meses";
}

function pick3Letters(input: string) {
  const cleaned = normalizeText(input).replace(/[^a-z0-9 ]/g, " ").trim();
  const first = cleaned.split(/\s+/).filter(Boolean)[0] ?? "xxx";
  return (first.slice(0, 3) || "xxx").toUpperCase();
}

export function generateAutomaticSKU(product: {
  id?: string | null;
  name: string;
  categoryName?: string | null;
}) {
  const cat = pick3Letters(product.categoryName ?? "CAT");
  const nm = pick3Letters(product.name ?? "PRO");
  const id = String(product.id ?? "").replace(/[^a-zA-Z0-9]/g, "");
  const shortId = (id.slice(0, 4) || Math.floor(Math.random() * 9000 + 1000).toString()).toUpperCase();
  return `${cat}-${nm}-${shortId}`;
}

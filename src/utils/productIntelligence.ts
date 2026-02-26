import { normalizeText } from "@/utils/normalize";

export function detectUnitByProductName(name: string, category?: string | null) {
  const hay = normalizeText(`${category ?? ""} ${name ?? ""}`);

  if (hay.includes("cimento")) return "saco";
  if (hay.includes("areia")) return "m³";
  if (hay.includes("brita")) return "m³";
  if (hay.includes("tubo") || hay.includes("cano")) return "barra";
  if (hay.includes("fio") || hay.includes("cabo")) return "metro";
  if (hay.includes("tinta")) return "lata";
  if (hay.includes("telha")) return "unidade";
  if (hay.includes("caixa d'agua") || hay.includes("caixa d\u2019agua") || (hay.includes("caixa") && hay.includes("agua"))) return "unidade";
  if (hay.includes("prego")) return "kg";
  if (hay.includes("parafuso")) return "unidade";

  return null;
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

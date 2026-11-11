import { publicImageUrl } from "@/utils/storage";
import { resolveCategoryPng } from "@/utils/categoryIcons";
import fortlevLogo from "@/assets/fortlev-logo.png";
import festivalCaixasMobile from "@/assets/banners/festival-caixas-mobile.png";
import areiaIcon from "@/assets/category-icons/areia.png";
import blocosIcon from "@/assets/category-icons/blocos.png";
import cimentoIcon from "@/assets/category-icons/cimento.png";
import eletricaIcon from "@/assets/category-icons/eletrica.png";
import ferramentasIcon from "@/assets/category-icons/ferramentas.png";
import madeiraIcon from "@/assets/category-icons/madeira.png";
import pinturaIcon from "@/assets/category-icons/pintura.png";
import vergalhaoIcon from "@/assets/category-icons/vergalhao.png";
import churrasqueiraIcon from "@/assets/category-icons/churrasqueira.png";

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
 * Resolves a high-quality contextual local image when no remote image is present.
 */
export function resolveProductFallbackImage(name?: string | null, category?: string | null): string {
  const text = `${name ?? ""} ${category ?? ""}`.toLowerCase();

  // Fortlev e caixas d'água
  if (/(caixa.*(água|agua|fortlev|kmr|3000|1000|2000|5000)|reservat)/.test(text)) {
    return festivalCaixasMobile;
  }
  if (/(fortlev)/.test(text)) {
    return fortlevLogo;
  }

  // Cimento, argamassa e rejunte
  if (/(cimento|argamassa|cal|gesso|rejunte|massa|ac1|ac2|ac3)/.test(text)) {
    return cimentoIcon;
  }

  // Blocos, tijolos e canaletas
  if (/(bloco|tijolo|canaleta|alvenaria|refrat)/.test(text)) {
    return blocosIcon;
  }

  // Areia, brita e agregados
  if (/(areia|brita|pedra|areola|rachao|cascalho)/.test(text)) {
    return areiaIcon;
  }

  // Aço e ferragens
  if (/(aco|aço|ferrag|vergalh|arame|estribo|barra)/.test(text)) {
    return vergalhaoIcon;
  }

  // Telhas e coberturas
  if (/(telha|cobert|fibrocimento|cumeeira|manta|madeira)/.test(text)) {
    return madeiraIcon;
  }

  // Hidráulica, tubos, canos e conexões
  if (/(cano|tubo|joelho|esgoto|soldavel|cpvc|hidraul|conex)/.test(text)) {
    return eletricaIcon;
  }

  // Pintura e verniz
  if (/(tinta|pintur|verniz|esmalte|selador)/.test(text)) {
    return pinturaIcon;
  }

  // Ferramentas e equipamentos
  if (/(ferramenta|betoneira|carrinho|desempen|pa|enxada)/.test(text)) {
    return ferramentasIcon;
  }

  // Churrasqueiras e lazer
  if (/(churrasq|gourmet)/.test(text)) {
    return churrasqueiraIcon;
  }

  // Se tem categoria informada, tenta resolver via resolveCategoryPng
  const catImg = resolveCategoryPng(category, category);
  if (catImg) return catImg;

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

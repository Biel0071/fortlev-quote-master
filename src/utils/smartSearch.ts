import { normalizeText } from "@/utils/normalize";

const SYNONYM_MAP: Record<string, string[]> = {
  caixa: ["caixa", "caixa dagua", "caixa d agua", "reservatorio", "fortlev", "tanque", "cisterna", "polietileno"],
  reservatorio: ["reservatorio", "caixa", "caixa dagua", "fortlev", "tanque", "cisterna", "polietileno"],
  tanque: ["tanque", "reservatorio", "caixa", "fortlev", "polietileno"],
  cisterna: ["cisterna", "reservatorio", "caixa", "tanque"],
  fortlev: ["fortlev", "caixa", "reservatorio", "tanque", "polietileno", "fossa"],
  agua: ["agua", "caixa", "reservatorio", "tanque", "fortlev", "cisterna", "polietileno"],
  dagua: ["dagua", "agua", "caixa", "reservatorio", "fortlev", "tanque", "polietileno"],
  cano: ["cano", "tubo", "conexao", "pvc", "tubulacao"],
  tubo: ["tubo", "cano", "conexao", "pvc", "tubulacao"],
  pvc: ["pvc", "tubo", "cano", "conexao"],
  cimento: ["cimento", "argamassa", "concreto", "massa", "liz"],
  argamassa: ["argamassa", "cimento", "rejunte", "massa"],
  bloco: ["bloco", "tijolo", "alvenaria", "vedacao"],
  tijolo: ["tijolo", "bloco", "alvenaria"],
  areia: ["areia", "brita", "agregado", "pedra"],
  brita: ["brita", "areia", "agregado", "pedra"],
  tinta: ["tinta", "pintura", "verniz", "textura", "latex"],
  pintura: ["pintura", "tinta", "verniz", "textura"],
  fio: ["fio", "cabo", "eletrica", "eletrico"],
  cabo: ["cabo", "fio", "eletrica", "eletrico"],
  madeira: ["madeira", "tabua", "caibro", "ripa", "sarrafo", "viga"],
  ferramenta: ["ferramenta", "martelo", "chave", "alicate", "serra"],
  torneira: ["torneira", "registro", "valvula", "hidraulica"],
  registro: ["registro", "torneira", "valvula", "hidraulica"],
  fossa: ["fossa", "septica", "esgoto", "fortlev", "biodigestor"],
  betoneira: ["betoneira", "mistura", "concreto", "csm"],
  vergalhao: ["vergalhao", "ferro", "aco", "ferragem", "armacao"],
  ferro: ["ferro", "vergalhao", "aco", "ferragem"],
  porta: ["porta", "janela", "esquadria", "batente"],
  janela: ["janela", "porta", "esquadria", "vidro"],
  telha: ["telha", "telhado", "cobertura", "cumeeira", "fibrocimento"],
  piso: ["piso", "porcelanato", "ceramica", "revestimento"],
  laje: ["laje", "vigota", "tavela", "pre-moldado"],
  churrasqueira: ["churrasqueira", "gourmet", "churrasco"],
  impermeabilizante: ["impermeabilizante", "manta", "vedacao", "impermeabilizacao"],
  kmr: ["kmr", "caixa", "reservatorio", "polietileno"],
  liz: ["liz", "cimento", "cp2", "cp4", "cpii", "cpiv"],
};

export function expandSearchTerms(raw: string): string[] {
  const norm = normalizeText(raw);
  const words = norm.split(/\s+/).filter(Boolean);

  const expanded = new Set<string>();
  expanded.add(norm);

  for (const word of words) {
    expanded.add(word);
    const synonyms = SYNONYM_MAP[word];
    if (synonyms) {
      for (const s of synonyms) expanded.add(s);
    }
    for (const [key, vals] of Object.entries(SYNONYM_MAP)) {
      if (key.includes(word) || word.includes(key)) {
        for (const v of vals) expanded.add(v);
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Score a product against search terms. Higher = better match.
 * Returns 0 if no match.
 */
export function smartScore(
  product: { name: string; description?: string | null; category?: string | null },
  searchTerms: string[],
): number {
  const nameNorm = normalizeText(product.name ?? "");
  const descNorm = normalizeText(product.description ?? "");
  const catNorm = normalizeText(product.category ?? "");

  let score = 0;
  for (const term of searchTerms) {
    if (nameNorm.includes(term)) score += 10;
    if (descNorm.includes(term)) score += 3;
    if (catNorm.includes(term)) score += 2;
  }
  return score;
}

export function smartMatch(
  product: { name: string; description?: string | null; category?: string | null },
  searchTerms: string[],
): boolean {
  return smartScore(product, searchTerms) > 0;
}

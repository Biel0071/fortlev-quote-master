import { normalizeText } from "@/utils/normalize";

/**
 * Synonym map: when the user searches for a key, we also match any of its synonyms.
 */
const SYNONYM_MAP: Record<string, string[]> = {
  caixa: ["caixa", "caixa d'agua", "caixa dagua", "reservatorio", "fortlev", "tanque"],
  reservatorio: ["reservatorio", "caixa", "caixa d'agua", "fortlev", "tanque"],
  tanque: ["tanque", "reservatorio", "caixa", "fortlev"],
  cano: ["cano", "tubo", "conexao", "pvc", "tubulacao"],
  tubo: ["tubo", "cano", "conexao", "pvc", "tubulacao"],
  pvc: ["pvc", "tubo", "cano", "conexao"],
  cimento: ["cimento", "argamassa", "concreto", "massa"],
  argamassa: ["argamassa", "cimento", "rejunte", "massa"],
  bloco: ["bloco", "tijolo", "alvenaria"],
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
  fossa: ["fossa", "septica", "esgoto", "fortlev"],
  betoneira: ["betoneira", "mistura", "concreto"],
  vergalhao: ["vergalhao", "ferro", "aco", "ferragem", "armacao"],
  ferro: ["ferro", "vergalhao", "aco", "ferragem"],
  porta: ["porta", "janela", "esquadria", "batente"],
  janela: ["janela", "porta", "esquadria", "vidro"],
  telha: ["telha", "telhado", "cobertura", "cumeeira"],
  piso: ["piso", "porcelanato", "ceramica", "revestimento"],
  laje: ["laje", "vigota", "tavela", "pre-moldado"],
  churrasqueira: ["churrasqueira", "gourmet", "churrasco"],
  impermeabilizante: ["impermeabilizante", "manta", "vedacao", "impermeabilizacao"],
};

/**
 * Expand a search term into a list of related terms using the synonym map.
 */
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
    // Also check partial matches in keys
    for (const [key, vals] of Object.entries(SYNONYM_MAP)) {
      if (key.includes(word) || word.includes(key)) {
        for (const v of vals) expanded.add(v);
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Check if a product matches the search using smart synonyms.
 */
export function smartMatch(
  product: { name: string; description?: string | null; category?: string | null },
  searchTerms: string[],
): boolean {
  const haystack = normalizeText(
    `${product.name ?? ""} ${product.description ?? ""} ${product.category ?? ""}`,
  );
  return searchTerms.some((term) => haystack.includes(term));
}

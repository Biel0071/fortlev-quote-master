/**
 * Formata o nome de um produto para exibição pública:
 * - Remove SKU/código bruto no início do nome (ex.: "50hda79rt Retificado..." → "Retificado...").
 * - Aplica capitalização título ao restante.
 * - Preserva unidades comuns (kg, ml, L, cm, m, mm, x) e siglas conhecidas.
 */

const SKU_PREFIX = /^[a-z0-9]{4,14}(?:\s+|-)/i;
const KEEP_UPPER = new Set([
  "cp", "cpii", "cpiii", "cpiv", "cpv", "pvc", "led", "mdf", "mdp", "abnt",
  "abs", "cbuq", "3d", "l", "ml", "kg", "cm", "mm", "m", "l/h", "rs", "ll",
]);
const KEEP_LOWER = new Set(["de", "da", "do", "das", "dos", "e", "para", "com", "sem", "em"]);

function looksLikeSku(token: string) {
  // token com mistura de letras e números (ex.: 50hda79rt) - alto risco de SKU
  const letters = /[a-z]/i.test(token);
  const digits = /\d/.test(token);
  return letters && digits;
}

export function formatProductTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  let name = String(raw).trim();

  // Remove SKU no início (apenas se for um "code" com letras+dígitos misturados)
  const first = name.split(/\s+/)[0] ?? "";
  if (first && looksLikeSku(first) && SKU_PREFIX.test(name)) {
    name = name.replace(SKU_PREFIX, "").trim();
  }

  if (!name) return String(raw).trim();

  // Title case preservando siglas e conectivos
  const parts = name.split(/\s+/).map((w, i) => {
    const low = w.toLowerCase();
    if (KEEP_UPPER.has(low)) return low.toUpperCase();
    if (i > 0 && KEEP_LOWER.has(low)) return low;
    // Preserva medidas tipo "50x50", "3000L"
    if (/^\d/.test(w)) return w.toUpperCase();
    return low.charAt(0).toUpperCase() + low.slice(1);
  });

  return parts.join(" ");
}

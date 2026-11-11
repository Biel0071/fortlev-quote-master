// Valida imagens reais: cada registro aponta para um arquivo existente; detecta URLs quebradas e duplicados.
// Usa a chave anon do ambiente (o que o site público enxerga). Uso: node tests/images-integrity.mjs
import { loadEnv, api } from "../scripts/lib/common.mjs";
loadEnv();
const base = process.env.TARGET_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.TARGET_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sources = [
  { table: "store_product_images", bucket: "product-images", fields: ["path"] },
  { table: "store_categories", bucket: "category-images", fields: ["image_path"] },
  { table: "store_banners", bucket: "banner-images", fields: ["image_path", "image_desktop_path", "image_mobile_path"] },
];
let missing = 0, empty = 0, total = 0;
const seen = new Map();
for (const s of sources) {
  const r = await api(`${base}/rest/v1/${s.table}?select=*`, key);
  if (!r.ok) { console.error(`${s.table}: HTTP ${r.status}`); process.exit(1); }
  for (const row of await r.json()) for (const f of s.fields) {
    const p = row[f];
    if (!p) { if (f === "path" || f === "image_path") empty++; continue; }
    if (/^(https?:|\/|data:)/.test(p)) continue; // URL externa/local: fora do escopo do bucket
    total++;
    const url = `${base}/storage/v1/object/public/${s.bucket}/${p.split("/").map(encodeURIComponent).join("/")}`;
    seen.set(url, (seen.get(url) || 0) + 1);
    const h = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(30000) });
    if (!h.ok) { missing++; console.error(`QUEBRADA (${h.status}): ${s.table}.${f} -> ${s.bucket}/${p}`); }
  }
}
const dups = [...seen].filter(([, n]) => n > 1);
console.log(`verificadas=${total} quebradas=${missing} sem_caminho=${empty} caminhos_repetidos=${dups.length}`);
process.exit(missing ? 1 : 0);

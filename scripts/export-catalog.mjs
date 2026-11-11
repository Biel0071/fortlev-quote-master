// Exporta catálogo (JSON) e fotos públicas do Supabase atual para `data/catalog/`,
// para versionar no GitHub e não depender do Lovable Cloud.
// Uso: node scripts/export-catalog.mjs
// Usa apenas a chave pública (anon) do .env: exporta somente o que a RLS libera para leitura pública.
import fs from "fs";
import path from "path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const env = {};
fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/).forEach((l) => {
  const i = l.indexOf("=");
  if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
});
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const out = path.join(root, "data", "catalog");
fs.mkdirSync(path.join(out, "images"), { recursive: true });

const TABLES = [
  "stores", "store_categories", "products", "product_images",
  "store_banners", "home_benefits", "home_policies", "home_sections",
  "home_footer", "home_departments", "home_offers", "home_seo",
];
// bucket -> campos que contêm caminhos de arquivo
const FILE_FIELDS = ["path", "image_path", "image_desktop_path", "image_mobile_path", "logo_path", "og_image_path"];
const BUCKETS = ["product-images", "category-images", "banner-images", "store-assets"];

async function getAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${URL_}/rest/v1/${table}?select=*`, {
      headers: { ...H, Range: `${from}-${from + 999}` },
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error(`${table}: HTTP ${r.status}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

const files = new Set();
for (const t of TABLES) {
  try {
    const rows = await getAll(t);
    fs.writeFileSync(path.join(out, `${t}.json`), JSON.stringify(rows, null, 2));
    rows.forEach((row) => FILE_FIELDS.forEach((f) => typeof row[f] === "string" && row[f] && !row[f].startsWith("http") && files.add(row[f])));
    console.log(`OK  ${t}: ${rows.length} linhas`);
  } catch (e) {
    console.log(`ERRO ${t}: ${e.message}`);
  }
}

let ok = 0, fail = 0;
for (const p of files) {
  let saved = false;
  for (const b of BUCKETS) {
    try {
      const r = await fetch(`${URL_}/storage/v1/object/public/${b}/${p}`, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) continue;
      const dest = path.join(out, "images", b, p);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      saved = true; ok++;
      break;
    } catch { /* tenta o próximo bucket */ }
  }
  if (!saved) { fail++; console.log(`sem arquivo: ${p}`); }
}
console.log(`Imagens baixadas: ${ok} | não encontradas: ${fail}`);

// Disponibilidade do Storage: lista os buckets e confere se os públicos esperados existem.
// Requer TARGET_SUPABASE_URL + TARGET_SERVICE_ROLE_KEY (ou SOURCE_* para auditar a origem).
import { loadEnv, api, listBucketObjects } from "../scripts/lib/common.mjs";
loadEnv();
const base = process.env.TARGET_SUPABASE_URL || process.env.SOURCE_SUPABASE_URL;
const key = process.env.TARGET_SERVICE_ROLE_KEY || process.env.SOURCE_SERVICE_ROLE_KEY;
if (!base || !key) { console.error("Defina TARGET_SUPABASE_URL e TARGET_SERVICE_ROLE_KEY em .env.local"); process.exit(2); }
const expected = ["apps", "banner-images", "category-images", "product-images", "site-banners", "talent-resumes", "product-media"];
const r = await api(`${base}/storage/v1/bucket`, key);
if (!r.ok) { console.error(`Storage indisponível: HTTP ${r.status}`); process.exit(1); }
const buckets = await r.json();
const names = buckets.map((b) => b.name);
let fail = 0;
for (const e of expected) if (!names.includes(e)) { console.error(`bucket ausente: ${e}`); fail++; }
for (const b of buckets) console.log(`${b.name} (public=${b.public}): ${(await listBucketObjects(base, key, b.name)).length} objetos`);
process.exit(fail ? 1 : 0);

// Compara o manifesto do backup (origem) com o Supabase de DESTINO: linhas por tabela, buckets e arquivos.
// Requer .env.local: TARGET_DB_URL, TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY. Uso: node scripts/verify.mjs
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { ROOT, loadEnv, need, listBucketObjects } from "./lib/common.mjs";

loadEnv();
const DB = need("TARGET_DB_URL"), BASE = need("TARGET_SUPABASE_URL"), KEY = need("TARGET_SERVICE_ROLE_KEY");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "backups", "verification", "manifest.json"), "utf8"));
const q = `select table_name||'|'||(xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`;
const dest = Object.fromEntries(execFileSync("psql", [DB, "-At", "-c", q], { encoding: "utf8" }).split("\n").filter(Boolean).map((l) => l.split("|")));
const report = { tables: [], buckets: [] };
let failures = 0;
for (const [t, n] of Object.entries(manifest.tables)) {
  const d = dest[t] === undefined ? null : Number(dest[t]);
  const ok = d === n; if (!ok) failures++;
  report.tables.push({ table: t, source: n, target: d, ok });
}
for (const [b, info] of Object.entries(manifest.buckets)) {
  let d = null; try { d = (await listBucketObjects(BASE, KEY, b)).length; } catch { /* bucket ausente */ }
  const ok = d === info.objects; if (!ok) failures++;
  report.buckets.push({ bucket: b, source: info.objects, target: d, ok });
}
fs.writeFileSync(path.join(ROOT, "backups", "verification", "compare.json"), JSON.stringify(report, null, 2));
console.table(report.tables.filter((r) => !r.ok));
console.table(report.buckets);
console.log(failures ? `FALHOU: ${failures} divergência(s)` : "OK: todas as contagens batem");
process.exit(failures ? 1 : 0);

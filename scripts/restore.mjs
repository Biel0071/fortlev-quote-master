// Restaura um backup (scripts/backup.mjs) no Supabase de DESTINO.
// Pré-requisito: schema criado com `supabase db push` (migrations) OU via backups/database/schema_public.sql.
// Requer .env.local: TARGET_DB_URL, TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY. Requer psql no PATH.
// Uso: node scripts/restore.mjs [--with-schema] [--with-auth]
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { ROOT, loadEnv, need, sha256, api } from "./lib/common.mjs";

loadEnv();
const DB = need("TARGET_DB_URL");
const BASE = need("TARGET_SUPABASE_URL");
const KEY = need("TARGET_SERVICE_ROLE_KEY");
if (BASE.includes("flkionbmkuqgkudjjuqk")) { console.error("Destino aponta para o projeto antigo. Abortando."); process.exit(2); }
const B = path.join(ROOT, "backups");
const psql = (file) => execFileSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-f", file], { stdio: "inherit" });

if (process.argv.includes("--with-schema")) psql(path.join(B, "database", "schema_public.sql"));
psql(path.join(B, "database", "data_public.sql"));
if (process.argv.includes("--with-auth")) psql(path.join(B, "auth", "auth_users.sql"));

// Buckets (mesmos nomes e visibilidade) e arquivos (mesmos caminhos), conferindo SHA-256 do manifesto
const buckets = JSON.parse(fs.readFileSync(path.join(B, "metadata", "buckets.json"), "utf8"));
for (const b of buckets) {
  const r = await api(`${BASE}/storage/v1/bucket`, KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.name, name: b.name, public: b.public, file_size_limit: b.file_size_limit, allowed_mime_types: b.allowed_mime_types }) });
  if (!r.ok && r.status !== 409 && !(await r.text()).includes("already exists")) console.error(`bucket ${b.name}: HTTP ${r.status}`);
}
const manifest = JSON.parse(fs.readFileSync(path.join(B, "verification", "manifest.json"), "utf8"));
let ok = 0, fail = 0;
for (const f of manifest.files.filter((x) => !x.error)) {
  const buf = fs.readFileSync(path.join(B, "storage", f.bucket, f.path));
  if (sha256(buf) !== f.sha256) { console.error(`hash divergente: ${f.bucket}/${f.path}`); fail++; continue; }
  const r = await api(`${BASE}/storage/v1/object/${f.bucket}/${f.path.split("/").map(encodeURIComponent).join("/")}`, KEY, { method: "POST", headers: { "Content-Type": f.mimetype || "application/octet-stream", "x-upsert": "true" }, body: buf });
  r.ok ? ok++ : (fail++, console.error(`upload ${f.bucket}/${f.path}: HTTP ${r.status}`));
}
console.log(`Restauração: ${ok} arquivos enviados, ${fail} falhas. Rode: node scripts/verify.mjs`);
process.exit(fail ? 1 : 0);

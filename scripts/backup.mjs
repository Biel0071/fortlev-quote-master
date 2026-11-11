// Backup completo do Supabase de ORIGEM (somente leitura; não altera o banco).
// Requer: pg_dump e psql no PATH + variáveis em .env.local:
//   SOURCE_DB_URL, SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY
// Uso: node scripts/backup.mjs
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { ROOT, loadEnv, need, sha256, api, listBucketObjects } from "./lib/common.mjs";

loadEnv();
const DB = need("SOURCE_DB_URL");
const BASE = need("SOURCE_SUPABASE_URL");
const KEY = need("SOURCE_SERVICE_ROLE_KEY");
const B = path.join(ROOT, "backups");
for (const d of ["database", "storage", "products", "categories", "banners", "auth", "metadata", "verification"]) fs.mkdirSync(path.join(B, d), { recursive: true });

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 30 });
const manifest = { created_at: new Date().toISOString(), source: BASE, database: {}, tables: {}, buckets: {}, files: [] };

// 1) Banco: estrutura (tabelas, FKs, índices, triggers, funções, RLS) e dados
const dump = (file, args) => {
  const p = path.join(B, "database", file);
  run("pg_dump", ["--no-owner", "--no-privileges", `--file=${p}`, ...args, DB]);
  manifest.database[file] = { bytes: fs.statSync(p).size, sha256: sha256(fs.readFileSync(p)) };
};
dump("schema_public.sql", ["--schema-only", "--schema=public"]);
dump("data_public.sql", ["--data-only", "--schema=public", "--disable-triggers"]);
dump("auth_users.sql", ["--data-only", "--table=auth.users", "--table=auth.identities", "--disable-triggers"]);
fs.renameSync(path.join(B, "database", "auth_users.sql"), path.join(B, "auth", "auth_users.sql"));
manifest.database["auth_users.sql"] = { moved_to: "backups/auth/auth_users.sql", sha256: sha256(fs.readFileSync(path.join(B, "auth", "auth_users.sql"))) };

// 2) Contagem real de linhas por tabela
const q = `select table_name||'|'||(xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`;
for (const l of run("psql", [DB, "-At", "-c", q]).split("\n").filter(Boolean)) {
  const [t, n] = l.split("|");
  manifest.tables[t] = Number(n);
}

// 3) Catálogo em JSON (sem dados pessoais) para consulta/diff
const rest = async (t) => (await (await api(`${BASE}/rest/v1/${t}?select=*`, KEY)).json());
const catalog = { products: ["store_products", "store_product_images"], categories: ["store_categories"], banners: ["store_banners"] };
for (const [dir, tables] of Object.entries(catalog)) for (const t of tables) fs.writeFileSync(path.join(B, dir, `${t}.json`), JSON.stringify(await rest(t), null, 2));

// 4) Buckets reais (descobertos na API, sem presumir nomes) e arquivos
const buckets = await (await api(`${BASE}/storage/v1/bucket`, KEY)).json();
fs.writeFileSync(path.join(B, "metadata", "buckets.json"), JSON.stringify(buckets, null, 2));
for (const b of buckets) {
  const objs = await listBucketObjects(BASE, KEY, b.name);
  manifest.buckets[b.name] = { public: b.public, objects: objs.length };
  for (const o of objs) {
    const r = await api(`${BASE}/storage/v1/object/${b.name}/${o.path.split("/").map(encodeURIComponent).join("/")}`, KEY);
    if (!r.ok) { manifest.files.push({ bucket: b.name, path: o.path, error: `HTTP ${r.status}` }); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    const dest = path.join(B, "storage", b.name, o.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    manifest.files.push({ bucket: b.name, path: o.path, bytes: buf.length, sha256: sha256(buf), mimetype: o.mimetype });
  }
}
fs.writeFileSync(path.join(B, "verification", "manifest.json"), JSON.stringify(manifest, null, 2));
const bad = manifest.files.filter((f) => f.error).length;
console.log(`Backup concluído: ${Object.keys(manifest.tables).length} tabelas, ${manifest.files.length} arquivos (${bad} com erro). Manifesto: backups/verification/manifest.json`);
process.exit(bad ? 1 : 0);

// Utilitários compartilhados dos scripts de backup/restauração/testes.
// Segredos vêm SOMENTE de variáveis de ambiente ou do arquivo .env.local (ignorado pelo Git).
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadEnv() {
  for (const f of [".env", ".env.local"]) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const i = l.indexOf("=");
      if (i > 0 && !l.trim().startsWith("#")) {
        const k = l.slice(0, i).trim();
        if (!(k in process.env) || f === ".env.local") process.env[k] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
      }
    }
  }
  return process.env;
}

export function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Variável ausente: ${name} (defina em .env.local; veja .env.example)`);
    process.exit(2);
  }
  return v;
}

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

export function authHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function api(url, key, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...authHeaders(key), ...(init.headers || {}) }, signal: AbortSignal.timeout(60000) });
  return r;
}

export async function listBucketObjects(base, key, bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await api(`${base}/storage/v1/object/list/${bucket}`, key, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!r.ok) throw new Error(`list ${bucket}/${prefix}: HTTP ${r.status}`);
    const page = await r.json();
    for (const it of page) {
      if (it.id === null || it.metadata === null) out.push(...(await listBucketObjects(base, key, bucket, `${prefix}${it.name}/`)));
      else out.push({ path: `${prefix}${it.name}`, size: it.metadata?.size ?? null, mimetype: it.metadata?.mimetype ?? null });
    }
    if (page.length < 1000) break;
  }
  return out;
}

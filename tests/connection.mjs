// Teste de conexão REST/DB com o Supabase configurado em VITE_SUPABASE_URL (ou TARGET_*).
import { loadEnv, api } from "../scripts/lib/common.mjs";
loadEnv();
const base = process.env.TARGET_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.TARGET_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) { console.error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY"); process.exit(2); }
try {
  const r = await api(`${base}/rest/v1/store_categories?select=id&limit=1`, key);
  console.log(`${base} -> HTTP ${r.status}`);
  process.exit(r.ok ? 0 : 1);
} catch (e) {
  console.error(`FALHA de conexão com ${base}: ${e.message}`);
  process.exit(1);
}

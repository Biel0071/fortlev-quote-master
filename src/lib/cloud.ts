import { createClient } from "@supabase/supabase-js";

// Lovable Cloud: these env vars are provisioned automatically.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.warn("Lovable Cloud env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
}

export const cloud = createClient(url ?? "", key ?? "");

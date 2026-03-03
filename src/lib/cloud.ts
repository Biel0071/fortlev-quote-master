import { createClient } from "@supabase/supabase-js";

// Lovable Cloud: these env vars are provisioned automatically.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.warn("Lovable Cloud env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
}

const safeStorage: Storage | undefined = (() => {
  try {
    if (typeof window === "undefined") return undefined;
    const storage = window.localStorage;
    const probeKey = "__cloud_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return undefined;
  }
})();

// IMPORTANT: configure auth storage so `functions.invoke()` sends Authorization header.
export const cloud = createClient(url ?? "", key ?? "", {
  auth: {
    storage: safeStorage,
    persistSession: Boolean(safeStorage),
    autoRefreshToken: Boolean(safeStorage),
  },
});


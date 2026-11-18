import React, { createContext, useContext, useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { cloud } from "@/lib/cloud";
import { isDatabaseStoreId } from "@/utils/storeId";

export type AppStore = "materiais" | "fortlev" | "construcao" | string;

type StoreDbRow = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  store_domains?: Array<{ domain: string | null; verified: boolean | null }>;
  active: boolean;
};

type StoreContextValue = {
  store: AppStore;
  setStore: (store: AppStore) => string | null;
  label: string;
  storesLoading: boolean;
  storesError: string | null;
  reloadStores: () => void;
  activeStoreId: string | null;
  availableStores: Array<{ value: AppStore; label: string; id: string }>;
  setActiveStoreId: (id: string | null) => void;
  routes: {
    publicHome: string;
    quotations: string;
    dashboard: string;
    adminBase: string;
    adminPath: (path?: string) => string;
  };
};

const StoreContext = createContext<StoreContextValue | null>(null);

const STORE_LABEL: Record<string, string> = {
  materiais: "Materiais de Construção",
  fortlev: "Home Completa Fortlev",
  construcao: "Construção (Orçamentos)",
};

const STORES_CACHE_KEY = "lovable:stores:v3";
const STORES_CACHE_TTL = 5 * 60 * 1000;

function loadCachedStores(): StoreDbRow[] | null {
  try {
    const raw = sessionStorage.getItem(STORES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: StoreDbRow[] };
    if (!parsed?.data || Date.now() - parsed.at > STORES_CACHE_TTL) return null;
    return parsed.data.filter((store) => isDatabaseStoreId(store.id));
  } catch {
    return null;
  }
}

function describeStoreLoadError(error: unknown) {
  const readError = error as { code?: string; message?: string };
  if (readError?.code === "42501" || /permission|row-level security|not authorized/i.test(readError?.message ?? "")) {
    return "Sem permissão para consultar as lojas.";
  }
  return "Banco indisponível: não foi possível listar as lojas.";
}

function saveCachedStores(data: StoreDbRow[]) {
  try {
    sessionStorage.setItem(STORES_CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* ignore */
  }
}

function getHostnameCandidates(hostname: string) {
  const clean = hostname.toLowerCase().replace(/^www\./, '');
  return Array.from(new Set([hostname.toLowerCase(), clean, `www.${clean}`]));
}

function storeMatchesHost(store: StoreDbRow, hostnameCandidates: string[]) {
  const domains = [
    store.domain,
    ...((store.store_domains ?? [])
      .filter((d) => d.verified !== false)
      .map((d) => d.domain)),
  ]
    .filter(Boolean)
    .map((domain) => String(domain).toLowerCase());

  return domains.some((domain) => hostnameCandidates.includes(domain) || hostnameCandidates.includes(domain.replace(/^www\./, '')));
}

type StoreProviderProps = { children: React.ReactNode };

export function StoreProvider({ children }: StoreProviderProps) {
  const location = useLocation();
  const cached = useMemo(loadCachedStores, []);
  const [store, setStoreRaw] = useState<AppStore>("materiais");
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [dbStores, setDbStores] = useState<StoreDbRow[]>(cached ?? []);
  const [storesLoading, setStoresLoading] = useState(cached === null);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [storesRetry, setStoresRetry] = useState(0);
  const reloadStores = useCallback(() => setStoresRetry((attempt) => attempt + 1), []);

  // Refs to avoid re-running effect on state changes it itself produces
  const storeRef = useRef(store);
  const activeIdRef = useRef(activeStoreId);
  storeRef.current = store;
  activeIdRef.current = activeStoreId;

  // Load stores from DB once (and refresh cache silently)
  useEffect(() => {
    let cancelled = false;
    setStoresLoading(true);
    setStoresError(null);
    const timer = setTimeout(() => {
      if (!cancelled) {
        setStoresError("A consulta das lojas excedeu o tempo limite. Verifique a conexão e tente novamente.");
        setStoresLoading(false);
      }
    }, 10000);

    cloud
      .from("stores")
      .select("id, name, slug, domain, active, store_domains(domain, verified)")
      .order("name")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        setStoresError(null);
        const realStores = ((data ?? []) as StoreDbRow[]).filter((item) => isDatabaseStoreId(item.id));
        setDbStores(realStores);
        saveCachedStores(realStores);
      })
      .catch((err) => {
        if (!cancelled) setStoresError(describeStoreLoadError(err));
        console.warn("Could not fetch remote stores:", err);
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setStoresLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [storesRetry]);

  // Resolve active store from URL/hostname. Depends ONLY on dbStores + pathname
  // — never on `store`/`activeStoreId` (would loop).
  useEffect(() => {
    if (dbStores.length === 0) return;
    const hostCandidates = getHostnameCandidates(window.location.hostname);
    const pathname = location.pathname;
    const currentStore = storeRef.current;
    const currentId = activeIdRef.current;

    const apply = (slug: string, id: string | null) => {
      if (currentStore !== slug) setStoreRaw(slug);
      const databaseId = isDatabaseStoreId(id) ? id : null;
      if (currentId !== databaseId) setActiveStoreId(databaseId);
    };

    if (pathname === "/admin") {
      if (currentId !== null) setActiveStoreId(null);
      return;
    }
    if (pathname.startsWith("/admin/master") || pathname.startsWith("/auth")) {
      return;
    }

    const adminStoreMatch = pathname.match(/\/admin\/store\/([^/]+)/);
    if (adminStoreMatch?.[1]) {
      const m = dbStores.find((s) => s.id === adminStoreMatch[1]);
      if (m) {
        apply(m.slug, m.id);
        return;
      }
      if (currentId !== null) setActiveStoreId(null);
      return;
    }

    const pMatch = pathname.match(/\/p\/([^/]+)/);
    if (pMatch?.[1]) {
      const m = dbStores.find((s) => s.slug === pMatch[1]);
      if (m) {
        apply(m.slug, m.id);
        return;
      }
    }

    const byDomain = dbStores.find((s) => storeMatchesHost(s, hostCandidates));
    if (byDomain) {
      apply(byDomain.slug, byDomain.id);
      return;
    }

    // Fallback: keep current slug; resolve missing id
    const current = dbStores.find((s) => s.slug === currentStore) ?? dbStores.find((s) => s.active) ?? dbStores[0];
    if (current && currentId !== current.id) {
      apply(current.slug, current.id);
    }
  }, [dbStores, location.pathname]);

  const setStore = (newStore: AppStore) => {
    const found = dbStores.find((s) => s.slug === newStore || s.id === newStore);
    if (found) {
      setStoreRaw(found.slug);
      const databaseId = isDatabaseStoreId(found.id) ? found.id : null;
      setActiveStoreId(databaseId);
      return databaseId;
    }
    setStoreRaw(newStore);
    return null;
  };

  const value = useMemo<StoreContextValue>(() => {
    const isStoreScopedAdminPath = location.pathname.startsWith("/admin/store/");
    const dbStore = activeStoreId
      ? dbStores.find((s) => s.id === activeStoreId)
      : isStoreScopedAdminPath
        ? undefined
        : dbStores.find((s) => s.slug === store);
    const adminBase = dbStore ? `/admin/store/${dbStore.id}` : "/admin";
    const adminPath = (path = "") => {
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      return `${adminBase}${cleanPath === "/" ? "" : cleanPath}`;
    };
    const label = dbStore?.name ?? (isStoreScopedAdminPath ? "Loja não identificada" : STORE_LABEL[store] ?? store);

    return {
      store,
      setStore,
      label,
      storesLoading,
      storesError,
      reloadStores,
      activeStoreId,
      availableStores: dbStores.map((s) => ({ value: s.slug, label: s.name, id: s.id })),
      setActiveStoreId,
      routes: {
        publicHome: dbStore ? `/p/${dbStore.slug}` : "/",
        quotations: "/orcamentos",
        dashboard: adminPath("/dashboard"),
        adminBase,
        adminPath,
      },
    };
  }, [store, activeStoreId, dbStores, storesLoading, storesError, reloadStores, location.pathname]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

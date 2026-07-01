import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cloud } from "@/lib/cloud";

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

const STORES_CACHE_KEY = "lovable:stores:v2";
const STORES_CACHE_TTL = 5 * 60 * 1000;

function loadCachedStores(): StoreDbRow[] | null {
  try {
    const raw = sessionStorage.getItem(STORES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: StoreDbRow[] };
    if (!parsed?.data || Date.now() - parsed.at > STORES_CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
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
  const [storesLoading, setStoresLoading] = useState(!cached);

  // Refs to avoid re-running effect on state changes it itself produces
  const storeRef = useRef(store);
  const activeIdRef = useRef(activeStoreId);
  storeRef.current = store;
  activeIdRef.current = activeStoreId;

  // Load stores from DB once (and refresh cache silently)
  useEffect(() => {
    let cancelled = false;
    cloud
      .from("stores")
      .select("id, name, slug, domain, active, store_domains(domain, verified)")
      .order("name")
      .then(({ data }) => {
        if (cancelled || !data) return;
        setDbStores(data as StoreDbRow[]);
        saveCachedStores(data as StoreDbRow[]);
      })
      .finally(() => {
        if (!cancelled) setStoresLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (currentId !== id) setActiveStoreId(id);
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
      setActiveStoreId(found.id);
      return found.id;
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
    const label = dbStore?.name ?? STORE_LABEL[store] ?? store;

    return {
      store,
      setStore,
      label,
      storesLoading,
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
  }, [store, activeStoreId, dbStores, storesLoading, location.pathname]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const STORE_OPTIONS: Array<{ value: AppStore; label: string }> = [
  { value: "materiais", label: "Materiais de Construção" },
  { value: "fortlev", label: "Home Completa Fortlev" },
  { value: "construcao", label: "Construção (Orçamentos)" },
];

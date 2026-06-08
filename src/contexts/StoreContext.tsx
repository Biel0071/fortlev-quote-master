import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { cloud } from "@/lib/cloud";

export type AppStore = "materiais" | "fortlev" | "construcao" | string;

type StoreDbRow = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  active: boolean;
};

type StoreContextValue = {
  store: AppStore;
  setStore: (store: AppStore) => void;
  label: string;
  /** The database UUID of the active store (null if not resolved yet) */
  activeStoreId: string | null;
  /** Set active store directly by database ID */
  setActiveStoreId: (id: string | null) => void;
  routes: {
    publicHome: string;
    quotations: string;
    dashboard: string;
  };
};

const StoreContext = createContext<StoreContextValue | null>(null);

const STORE_LABEL: Record<string, string> = {
  materiais: "Materiais de Construção",
  fortlev: "Home Completa Fortlev",
  construcao: "Construção (Orçamentos)",
};

type StoreProviderProps = {
  children: React.ReactNode;
};

export function StoreProvider({ children }: StoreProviderProps) {
  const [store, setStoreRaw] = useState<AppStore>("materiais");
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [dbStores, setDbStores] = useState<StoreDbRow[]>([]);

  // Load stores from DB once
  useEffect(() => {
    cloud
      .from("stores")
      .select("id, name, slug, domain, active")
      .order("name")
      .then(({ data }) => {
        if (data) setDbStores(data as StoreDbRow[]);
      });
  }, []);

  // Auto-detect store by hostname or route
  useEffect(() => {
    if (dbStores.length === 0) return;
    const host = window.location.hostname;
    const pathname = window.location.pathname;

    // 1. Check for /admin/store/:storeId
    const adminStoreMatch = pathname.match(/\/admin\/store\/([^\/]+)/);
    if (adminStoreMatch && adminStoreMatch[1]) {
      const matchedById = dbStores.find(s => s.id === adminStoreMatch[1]);
      if (matchedById) {
        if (store !== matchedById.slug || activeStoreId !== matchedById.id) {
          setStoreRaw(matchedById.slug);
          setActiveStoreId(matchedById.id);
        }
        return;
      }
    }

    // 2. Check for /p/:slug
    const pMatch = pathname.match(/\/p\/([^\/]+)/);
    if (pMatch && pMatch[1]) {
      const matchedBySlug = dbStores.find(s => s.slug === pMatch[1]);
      if (matchedBySlug) {
        if (store !== matchedBySlug.slug || activeStoreId !== matchedBySlug.id) {
          setStoreRaw(matchedBySlug.slug);
          setActiveStoreId(matchedBySlug.id);
        }
        return;
      }
    }

    // 3. Try matching by domain
    const matchedByDomain = dbStores.find(
      (s) => s.domain && (
        s.domain.toLowerCase() === host.toLowerCase() ||
        // Check if the current host is a subdomain or the main domain
        (host.toLowerCase() === 'materialdecontrucao.online' && s.domain.toLowerCase() === 'materialdecontrucao.online')
      )
    );

    if (matchedByDomain) {
      if (store !== matchedByDomain.slug || activeStoreId !== matchedByDomain.id) {
        setStoreRaw(matchedByDomain.slug);
        setActiveStoreId(matchedByDomain.id);
      }
      return;
    }

    // 4. Fallback to current state resolution
    const current = dbStores.find((s) => s.slug === store);
    if (current && activeStoreId !== current.id) {
      setActiveStoreId(current.id);
    }
  }, [dbStores, store, activeStoreId, window.location.pathname]);

  const setStore = (newStore: AppStore) => {
    setStoreRaw(newStore);
    const found = dbStores.find((s) => s.slug === newStore || s.id === newStore);
    if (found) {
      setStoreRaw(found.slug);
      setActiveStoreId(found.id);
    }
  };


  const value = useMemo<StoreContextValue>(() => {
    const dbStore = dbStores.find((s) => s.slug === store || s.id === activeStoreId);
    const label = dbStore?.name ?? STORE_LABEL[store] ?? store;

    return {
      store,
      setStore,
      label,
      activeStoreId,
      setActiveStoreId,
      routes: {
        publicHome: dbStore ? `/p/${dbStore.slug}` : "/",
        quotations: "/orcamentos",
        dashboard: "/admin/dashboard",
      },
    };
  }, [store, activeStoreId, dbStores]);


  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
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

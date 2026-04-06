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

  // Auto-detect store by hostname
  useEffect(() => {
    if (dbStores.length === 0) return;
    const host = window.location.hostname;

    // Try matching by domain
    const matched = dbStores.find(
      (s) => s.domain && s.domain.toLowerCase() === host.toLowerCase()
    );
    if (matched) {
      setStoreRaw(matched.slug);
      setActiveStoreId(matched.id);
      return;
    }

    // If no domain match, keep current selection but resolve its ID
    const current = dbStores.find((s) => s.slug === store);
    if (current && !activeStoreId) {
      setActiveStoreId(current.id);
    }
  }, [dbStores, store]);

  const setStore = (newStore: AppStore) => {
    setStoreRaw(newStore);
    const found = dbStores.find((s) => s.slug === newStore);
    setActiveStoreId(found?.id ?? null);
  };

  const value = useMemo<StoreContextValue>(() => {
    const routesBySlug: Record<string, StoreContextValue["routes"]> = {
      materiais: {
        publicHome: "/materiais",
        quotations: "/construcao",
        dashboard: "/dashboard/construcao",
      },
      fortlev: {
        publicHome: "/orcamentos",
        quotations: "/orcamentos",
        dashboard: "/dashboard/fortlev",
      },
      construcao: {
        publicHome: "/construcao",
        quotations: "/construcao",
        dashboard: "/dashboard/construcao",
      },
    };

    const dbStore = dbStores.find((s) => s.slug === store);
    const label = dbStore?.name ?? STORE_LABEL[store] ?? store;

    return {
      store,
      setStore,
      label,
      activeStoreId,
      setActiveStoreId,
      routes: routesBySlug[store] ?? {
        publicHome: "/",
        quotations: "/construcao",
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

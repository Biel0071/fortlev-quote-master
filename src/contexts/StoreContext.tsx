import React, { createContext, useContext, useMemo, useState } from "react";

export type AppStore = "materiais" | "fortlev" | "construcao";

const STORE_LABEL: Record<AppStore, string> = {
  materiais: "Materiais de Construção",
  fortlev: "Home Completa Fortlev",
  construcao: "Construção (Orçamentos)",
};

type StoreContextValue = {
  store: AppStore;
  setStore: (store: AppStore) => void;
  label: string;
  routes: {
    /** destino de "Ver loja" (público) */
    publicHome: string;
    /** destino do atalho de orçamentos */
    quotations: string;
    /** destino do dashboard (quando aplicável) */
    dashboard: string;
  };
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // pedido: padrão sempre "Materiais de Construção"
  const [store, setStore] = useState<AppStore>("materiais");

  const value = useMemo<StoreContextValue>(() => {
    const routesByStore: Record<AppStore, StoreContextValue["routes"]> = {
      materiais: {
        publicHome: "/materiais",
        quotations: "/construcao", // materiais: orçamento do módulo de construção
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

    return {
      store,
      setStore,
      label: STORE_LABEL[store],
      routes: routesByStore[store],
    };
  }, [store]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const STORE_OPTIONS: Array<{ value: AppStore; label: string }> = [
  { value: "materiais", label: STORE_LABEL.materiais },
  { value: "fortlev", label: STORE_LABEL.fortlev },
  { value: "construcao", label: STORE_LABEL.construcao },
];

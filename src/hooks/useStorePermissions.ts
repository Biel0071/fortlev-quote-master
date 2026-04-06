import { useEffect, useState, useCallback } from "react";
import { cloud } from "@/lib/cloud";
import { useStore } from "@/contexts/StoreContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

export type StoreModule =
  | "produtos"
  | "pedidos"
  | "orcamentos"
  | "cupons"
  | "avaliacoes"
  | "banners"
  | "frete"
  | "pagamentos"
  | "analytics"
  | "ia"
  | "integracoes";

export const ALL_MODULES: StoreModule[] = [
  "produtos",
  "pedidos",
  "orcamentos",
  "cupons",
  "avaliacoes",
  "banners",
  "frete",
  "pagamentos",
  "analytics",
  "ia",
  "integracoes",
];

export const MODULE_LABELS: Record<StoreModule, string> = {
  produtos: "Produtos",
  pedidos: "Pedidos",
  orcamentos: "Orçamentos",
  cupons: "Cupons",
  avaliacoes: "Avaliações",
  banners: "Banners",
  frete: "Frete",
  pagamentos: "Pagamentos",
  analytics: "Analytics",
  ia: "Inteligência Artificial",
  integracoes: "Integrações",
};

/** Maps sidebar page keys to store_permissions modules */
export const PAGE_TO_MODULE: Record<string, StoreModule> = {
  produtos: "produtos",
  categorias: "produtos",
  pedidos: "pedidos",
  orcamentos: "orcamentos",
  cupons: "cupons",
  avaliacoes: "avaliacoes",
  banners: "banners",
  frete: "frete",
  pagamentos: "pagamentos",
  funil: "analytics",
  "mapa-cliques": "analytics",
  "app-metricas": "analytics",
  clientes: "analytics",
  "insights-ia": "ia",
  "inteligencia-ia": "ia",
  integracoes: "integracoes",
};

type PermissionMap = Record<string, boolean>;

export function useStorePermissions() {
  const { activeStoreId } = useStore();
  const { isMaster } = useAdminPermissions();
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!activeStoreId) {
      setPermissions({});
      setLoading(false);
      return;
    }

    // Master always has all modules
    if (isMaster) {
      const all: PermissionMap = {};
      ALL_MODULES.forEach((m) => (all[m] = true));
      setPermissions(all);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await cloud
        .from("store_permissions")
        .select("module, enabled")
        .eq("store_id", activeStoreId);

      const map: PermissionMap = {};
      (data ?? []).forEach((row: any) => {
        map[row.module] = row.enabled;
      });
      setPermissions(map);
    } catch (e) {
      console.error("Error fetching store permissions:", e);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, isMaster]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const isModuleEnabled = useCallback(
    (module: StoreModule): boolean => {
      if (isMaster) return true;
      return permissions[module] === true;
    },
    [isMaster, permissions]
  );

  /** Check if a sidebar page should be visible based on store permissions */
  const isPageAllowed = useCallback(
    (page: string): boolean => {
      if (isMaster) return true;
      const module = PAGE_TO_MODULE[page];
      if (!module) return true; // pages without module mapping are always visible (dashboard, home, tema, configuracoes)
      return permissions[module] === true;
    },
    [isMaster, permissions]
  );

  return {
    permissions,
    loading,
    isModuleEnabled,
    isPageAllowed,
    refetch: fetchPermissions,
  };
}

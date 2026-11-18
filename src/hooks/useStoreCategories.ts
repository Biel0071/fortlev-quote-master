import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useTenant } from "@/providers/TenantProvider";
import { getSmartCache, runApiMicrotask, setSmartCache } from "@/utils/smartCache";
import { isDatabaseStoreId } from "@/utils/storeId";
import { chooseCatalogProducts, describeCatalogError } from "@/modules/catalog/catalogResult";

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path?: string | null;
  sort_order: number;
  featured: boolean;
  active: boolean;
};

const CATEGORIES_CACHE_BASE_KEY = "store_categories:list:v2";
const CATEGORIES_CACHE_TTL_MS = 1000 * 60 * 5;

type UseStoreCategoriesOptions = {
  enabled?: boolean;
};

export function useStoreCategories(options?: UseStoreCategoriesOptions) {
  const { store, isLoading: tenantLoading } = useTenant();
  const requested = options?.enabled ?? true;
  const enabled = requested && isDatabaseStoreId(store?.id ?? null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const CATEGORIES_CACHE_KEY = useMemo(() => `${CATEGORIES_CACHE_BASE_KEY}:${store?.id ?? 'default'}`, [store?.id]);

  const load = async (opts?: { silent?: boolean }) => {
    if (!requested) {
      setLoading(false);
      return;
    }
    if (!enabled || !store?.id) {
      setCategories([]);
      setError("A loja não foi identificada no banco. As categorias locais não verificadas foram ocultadas.");
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await cloud
        .from("store_categories")
        .select("id, name, slug, description, image_path, sort_order, featured, active")
        .eq("store_id", store.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      const list = chooseCatalogProducts(data, []) as StoreCategory[];
      setCategories(list);
      setSmartCache(CATEGORIES_CACHE_KEY, list, CATEGORIES_CACHE_TTL_MS);
      setLoading(false);
    } catch (cause) {
      console.warn("[useStoreCategories] Não foi possível carregar categorias do banco:", cause);
      setCategories([]);
      setError(describeCatalogError(cause));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantLoading) {
      setError(null);
      setLoading(true);
      return;
    }
    if (!enabled) {
      if (requested) {
        setCategories([]);
        setError("A loja não foi identificada no banco. As categorias locais não verificadas foram ocultadas.");
      }
      setLoading(false);
      return;
    }

    const cached = getSmartCache<StoreCategory[]>(CATEGORIES_CACHE_KEY, CATEGORIES_CACHE_TTL_MS);
    if (cached) {
      setError(null);
      setCategories(cached);
      setLoading(false);
      runApiMicrotask(() => load({ silent: true }));
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, requested, tenantLoading, store?.id, CATEGORIES_CACHE_KEY]);

  const activeCategories = useMemo(() => categories.filter((c) => c.active), [categories]);
  const featuredCategories = useMemo(() => activeCategories.filter((c) => c.featured), [activeCategories]);

  return { categories, activeCategories, featuredCategories, loading, error, reload: load };
}

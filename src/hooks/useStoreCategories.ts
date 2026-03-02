import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { getSmartCache, runApiMicrotask, setSmartCache } from "@/utils/smartCache";

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

const CATEGORIES_CACHE_KEY = "store_categories:list";
const CATEGORIES_CACHE_TTL_MS = 1000 * 60 * 5;

type UseStoreCategoriesOptions = {
  enabled?: boolean;
};

export function useStoreCategories(options?: UseStoreCategoriesOptions) {
  const enabled = options?.enabled ?? true;
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = async (opts?: { silent?: boolean }) => {
    if (!enabled) return;
    if (!opts?.silent) setLoading(true);
    setError(null);

    const { data, error } = await cloud
      .from("store_categories")
      .select("id, name, slug, description, image_path, sort_order, featured, active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setCategories([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as StoreCategory[];
    setCategories(list);
    setSmartCache(CATEGORIES_CACHE_KEY, list, CATEGORIES_CACHE_TTL_MS);
    setLoading(false);
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const cached = getSmartCache<StoreCategory[]>(CATEGORIES_CACHE_KEY, CATEGORIES_CACHE_TTL_MS);
    if (cached) {
      setCategories(cached);
      setLoading(false);
      runApiMicrotask(() => load({ silent: true }));
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const activeCategories = useMemo(() => categories.filter((c) => c.active), [categories]);
  const featuredCategories = useMemo(() => activeCategories.filter((c) => c.featured), [activeCategories]);

  return { categories, activeCategories, featuredCategories, loading, error, reload: load };
}

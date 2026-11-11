import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useTenant } from "@/providers/TenantProvider";
import { getSmartCache, runApiMicrotask, setSmartCache } from "@/utils/smartCache";
import areiaIcon from "@/assets/category-icons/areia.png";
import blocosIcon from "@/assets/category-icons/blocos.png";
import cimentoIcon from "@/assets/category-icons/cimento.png";
import madeiraIcon from "@/assets/category-icons/madeira.png";
import vergalhaoIcon from "@/assets/category-icons/vergalhao.png";
import eletricaIcon from "@/assets/category-icons/eletrica.png";

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

const CATEGORIES_CACHE_BASE_KEY = "store_categories:list";
const CATEGORIES_CACHE_TTL_MS = 1000 * 60 * 5;

const FALLBACK_CATEGORIES: StoreCategory[] = [
  { id: "agregados", name: "Agregados", slug: "agregados", description: "Areia, brita e pedras", image_path: areiaIcon, sort_order: 1, featured: true, active: true },
  { id: "cimentos", name: "Cimentos e Argamassas", slug: "cimentos", description: "Cimentos, cal e argamassas", image_path: cimentoIcon, sort_order: 2, featured: true, active: true },
  { id: "blocos-tijolos", name: "Blocos e Tijolos", slug: "blocos-tijolos", description: "Tijolos, canaletas e blocos", image_path: blocosIcon, sort_order: 3, featured: true, active: true },
  { id: "telhas", name: "Telhas e Coberturas", slug: "telhas", description: "Telhas e mantas", image_path: madeiraIcon, sort_order: 4, featured: true, active: true },
  { id: "ferragens", name: "Aço e Ferragens", slug: "ferragens", description: "Vergalhões e arames", image_path: vergalhaoIcon, sort_order: 5, featured: true, active: true },
  { id: "hidraulica", name: "Hidráulica", slug: "hidraulica", description: "Tubos, conexões e caixas", image_path: eletricaIcon, sort_order: 6, featured: true, active: true },
];

type UseStoreCategoriesOptions = {
  enabled?: boolean;
};

export function useStoreCategories(options?: UseStoreCategoriesOptions) {
  const { store } = useTenant();
  const enabled = (options?.enabled ?? true) && !!store;
  const [categories, setCategories] = useState<StoreCategory[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CATEGORIES_CACHE_KEY = useMemo(() => `${CATEGORIES_CACHE_BASE_KEY}:${store?.id ?? 'default'}`, [store?.id]);

  const load = async (opts?: { silent?: boolean }) => {
    if (!enabled || !store?.id) return;
    if (!opts?.silent) setLoading(true);
    setError(null);

    const { data, error } = await cloud
      .from("store_categories")
      .select("id, name, slug, description, image_path, sort_order, featured, active")
      .eq("store_id", store.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.warn("[useStoreCategories] Erro remoto. Ativando categorias padrão:", error);
      setCategories(FALLBACK_CATEGORIES);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as StoreCategory[];
    setCategories(list.length > 0 ? list : FALLBACK_CATEGORIES);
    setSmartCache(CATEGORIES_CACHE_KEY, list.length > 0 ? list : FALLBACK_CATEGORIES, CATEGORIES_CACHE_TTL_MS);
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
  }, [enabled, store?.id, CATEGORIES_CACHE_KEY]);

  const activeCategories = useMemo(() => categories.filter((c) => c.active), [categories]);
  const featuredCategories = useMemo(() => activeCategories.filter((c) => c.featured), [activeCategories]);

  return { categories, activeCategories, featuredCategories, loading, error, reload: load };
}

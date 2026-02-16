import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  featured: boolean;
  active: boolean;
};

export function useStoreCategories() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await cloud
      .from("store_categories")
      .select("id, name, slug, description, sort_order, featured, active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setCategories([]);
      setLoading(false);
      return;
    }

    setCategories((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCategories = useMemo(() => categories.filter((c) => c.active), [categories]);
  const featuredCategories = useMemo(() => activeCategories.filter((c) => c.featured), [activeCategories]);

  return { categories, activeCategories, featuredCategories, loading, error, reload: load };
}

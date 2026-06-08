import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useTenant } from "@/providers/TenantProvider";

export type StorePage = {
  id: string;
  slug: string;
  title: string;
  content_md: string;
  published: boolean;
  sort_order: number;
};

export function useStorePages() {
  const { store } = useTenant();
  const [pages, setPages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!store?.id) return;
    
    setLoading(true);
    setError(null);

    const { data, error } = await cloud
      .from("store_pages")
      .select("id, slug, title, content_md, published, sort_order")
      .eq("store_id", store.id)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (error) {
      setError(error.message);
      setPages([]);
      setLoading(false);
      return;
    }

    setPages((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  const publishedPages = useMemo(() => pages.filter((p) => p.published), [pages]);

  return { pages, publishedPages, loading, error, reload: load };
}

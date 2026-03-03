import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import type { StoreProduct, StoreProductImage } from "@/types/store";
import { constructionProducts } from "@/data/constructionProducts";
import { getSmartCache, runApiMicrotask, setSmartCache } from "@/utils/smartCache";

type ProductRow = StoreProduct;

type ProductWithImages = ProductRow & { images: StoreProductImage[] };

const PRODUCTS_CACHE_KEY = "store_products:list";
const PRODUCTS_CACHE_TTL_MS = 1000 * 60 * 3;

type UseStoreProductsOptions = {
  enabled?: boolean;
};

export function useStoreProducts(options?: UseStoreProductsOptions) {
  const enabled = options?.enabled ?? true;
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = async (opts?: { silent?: boolean }) => {
    if (!enabled) return;
    if (!opts?.silent) setLoading(true);
    setError(null);

    const { data, error } = await cloud
      .from("store_products")
      .select(
        "id, source_id, name, description, category, category_id, unit, price, promo_price, stock, min_stock, sku, featured, best_seller, views, clicks, sales, active, store_product_images(id, product_id, path, sort_order)",
      )
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setProducts([]);
      setLoading(false);
      return;
    }

    const mapped: ProductWithImages[] = (data ?? [])
      .map((p: any) => ({
        ...p,
        id: String(p?.id ?? "").trim(),
        name: String(p?.name ?? "").trim(),
        price: Number(p?.price ?? 0),
        promo_price: Number(p?.promo_price ?? 0),
        stock: Number(p?.stock ?? 0),
        images: (p.store_product_images ?? [])
          .filter((im: any) => !!im?.path)
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }))
      .filter((p: any) => {
        const ok = !!p.id && !!p.name;
        if (!ok) console.warn("[useStoreProducts] produto inválido ignorado", p);
        return ok;
      });

    setProducts(mapped);
    setSmartCache(PRODUCTS_CACHE_KEY, mapped, PRODUCTS_CACHE_TTL_MS);
    setLoading(false);
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const cached = getSmartCache<ProductWithImages[]>(PRODUCTS_CACHE_KEY, PRODUCTS_CACHE_TTL_MS);
    if (cached) {
      setProducts(cached);
      setLoading(false);
      runApiMicrotask(() => load({ silent: true }));
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  const fallbackMap = useMemo(() => {
    const map = new Map<string, { price: number; unit: string; category: string }>();
    for (const p of constructionProducts) {
      map.set(p.id, { price: p.basePrice, unit: p.unit, category: p.category });
    }
    return map;
  }, []);

  const enrichedActive = useMemo(() => {
    return activeProducts.map((p) => {
      const fb = p.source_id ? fallbackMap.get(p.source_id) : undefined;
      return {
        ...p,
        price: p.price > 0 ? p.price : fb?.price ?? p.price,
        unit: p.unit ?? fb?.unit ?? p.unit,
        category: p.category ?? fb?.category ?? p.category,
      };
    });
  }, [activeProducts, fallbackMap]);

  return { products, activeProducts: enrichedActive, loading, error, reload: load };
}

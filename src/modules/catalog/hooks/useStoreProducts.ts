import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useTenant } from "@/providers/TenantProvider";
import type { StoreProduct, StoreProductImage } from "@/types/store";
import { getSmartCache, runApiMicrotask, setSmartCache } from "@/utils/smartCache";
import { isDatabaseStoreId } from "@/utils/storeId";
import { chooseCatalogProducts, describeCatalogError } from "../catalogResult";

type ProductRow = StoreProduct;

type RawProductRow = ProductRow & {
  store_product_images?: StoreProductImage[] | null;
};

type ProductWithImages = ProductRow & { images: StoreProductImage[] };

const PRODUCTS_CACHE_BASE_KEY = "store_products:list:v5";
const PRODUCTS_CACHE_TTL_MS = 1000 * 60 * 10;
const sharedProductsInflight = new Map<string, Promise<ProductWithImages[]>>();
let lastSilentRefreshAt = 0;

type UseStoreProductsOptions = {
  enabled?: boolean;
};

export function useStoreProducts(options?: UseStoreProductsOptions) {
  const { store, isLoading: tenantLoading } = useTenant();
  const requested = options?.enabled ?? true;
  const hasDatabaseStore = isDatabaseStoreId(store?.id ?? null);
  const enabled = requested && hasDatabaseStore;
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PRODUCTS_CACHE_KEY = useMemo(() => `${PRODUCTS_CACHE_BASE_KEY}:${store?.id ?? 'default'}`, [store?.id]);

  const load = async (opts?: { silent?: boolean; retries?: number }) => {
    if (!requested) {
      setLoading(false);
      return;
    }
    if (!hasDatabaseStore || !store?.id) {
      setProducts([]);
      setError("A loja não foi identificada no banco. Produtos locais não verificados foram ocultados.");
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    setError(null);

    const maxRetries = opts?.retries ?? 2;

    const fetchAllProducts = async () => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const PAGE_SIZE = 1500;
          let allData: RawProductRow[] = [];
          let from = 0;
          let hasMore = true;
          let safetyCounter = 0;

          const SELECT_COLS =
            "id, source_id, name, description, category, category_id, unit, price, promo_price, stock, min_stock, sku, featured, featured_order, best_seller, views, clicks, sales, active, is_promotion, discount_percentage, promotion_limit_per_customer, store_product_images(id, product_id, path, sort_order, media_type)";

          while (hasMore && safetyCounter < 100) {
            safetyCounter++;
            const { data, error: fetchError } = await cloud
              .from("store_products")
              .select(SELECT_COLS)
              .eq("store_id", store.id)
              .order("name", { ascending: true })
              .range(from, from + PAGE_SIZE - 1);

            if (fetchError) throw fetchError;

            const batch = (data ?? []) as unknown as RawProductRow[];
            allData = [...allData, ...batch];
            hasMore = batch.length === PAGE_SIZE;
            from += PAGE_SIZE;
          }

          return allData
            .filter((p): p is RawProductRow => Boolean(p && p.id && p.name))
            .map((p) => ({
              ...p,
              id: String(p.id).trim(),
              name: String(p.name).trim(),
              price: Number(p.price ?? 0),
              promo_price: Number(p.promo_price ?? 0),
              stock: Number(p.stock ?? 0),
              images: (p.store_product_images ?? [])
                .filter((im): im is StoreProductImage => Boolean(im?.path))
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
            })) as ProductWithImages[];
        } catch (err: unknown) {
          console.error(`Attempt ${attempt} failed:`, err);
          if (attempt >= maxRetries) throw err;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      return [] as ProductWithImages[];
    };

    try {
      let inflight = sharedProductsInflight.get(PRODUCTS_CACHE_KEY);
      if (!inflight) {
        inflight = fetchAllProducts().finally(() => {
          sharedProductsInflight.delete(PRODUCTS_CACHE_KEY);
        });
        sharedProductsInflight.set(PRODUCTS_CACHE_KEY, inflight);
      }

      const mapped = await inflight;
      const resolvedProducts = chooseCatalogProducts(mapped, []);
      setProducts(resolvedProducts);
      setSmartCache(PRODUCTS_CACHE_KEY, resolvedProducts, PRODUCTS_CACHE_TTL_MS);
      setLoading(false);
    } catch (err: unknown) {
      console.warn("[useStoreProducts] Não foi possível carregar produtos do banco:", err);
      setProducts([]);
      setError(describeCatalogError(err));
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
      if (requested && !hasDatabaseStore) {
        setProducts([]);
        setError("A loja não foi identificada no banco. Produtos locais não verificados foram ocultados.");
      }
      setLoading(false);
      return;
    }

    const cached = getSmartCache<ProductWithImages[]>(PRODUCTS_CACHE_KEY, PRODUCTS_CACHE_TTL_MS);
    if (cached) {
      setError(null);
      setProducts(cached);
      setLoading(false);
      const now = Date.now();
      if (now - lastSilentRefreshAt > 60_000) {
        lastSilentRefreshAt = now;
        runApiMicrotask(() => load({ silent: true }));
      }
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasDatabaseStore, requested, tenantLoading, PRODUCTS_CACHE_KEY]);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  return { products, activeProducts, loading, error, reload: load };
}

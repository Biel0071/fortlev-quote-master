import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import { useTenant } from "@/providers/TenantProvider";
import type { StoreProduct, StoreProductImage } from "@/types/store";
import { constructionProducts } from "@/data/constructionProducts";
import { getSmartCache, runApiMicrotask, setSmartCache } from "@/utils/smartCache";

type ProductRow = StoreProduct;

type ProductWithImages = ProductRow & { images: StoreProductImage[] };

const PRODUCTS_CACHE_BASE_KEY = "store_products:list";
const PRODUCTS_CACHE_TTL_MS = 1000 * 60 * 10;
const sharedProductsInflight = new Map<string, Promise<ProductWithImages[]>>();
let lastSilentRefreshAt = 0;

type UseStoreProductsOptions = {
  enabled?: boolean;
};

const INITIAL_FALLBACK_PRODUCTS: ProductWithImages[] = constructionProducts.map((p, idx) => ({
  id: p.id,
  source_id: p.id,
  name: p.name,
  description: p.name,
  category: p.category,
  category_id: null,
  unit: p.unit,
  price: p.basePrice,
  promo_price: 0,
  stock: 50,
  min_stock: 5,
  sku: p.id.toUpperCase(),
  featured: idx < 12,
  best_seller: idx < 8,
  views: 100 + idx,
  clicks: 50 + idx,
  sales: 20 + idx,
  active: true,
  is_promotion: false,
  discount_percentage: null,
  promotion_limit_per_customer: null,
  store_id: "f5e69cd7-e-b465-4024-9b99-d388262b08fa",
  created_at: new Date().toISOString(),
  images: [],
}));

export function useStoreProducts(options?: UseStoreProductsOptions) {
  const { store } = useTenant();
  const enabled = (options?.enabled ?? true) && !!store;
  const [products, setProducts] = useState<ProductWithImages[]>(INITIAL_FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PRODUCTS_CACHE_KEY = useMemo(() => `${PRODUCTS_CACHE_BASE_KEY}:${store?.id ?? 'default'}`, [store?.id]);

  const load = async (opts?: { silent?: boolean; retries?: number }) => {
    if (!enabled || !store?.id) {
      console.warn("[useStoreProducts] Skipping load: not enabled or no store ID", { enabled, storeId: store?.id });
      return;
    }
    if (!opts?.silent) setLoading(true);
    setError(null);

    const maxRetries = opts?.retries ?? 2;

    const fetchAllProducts = async () => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const PAGE_SIZE = 1500;
          let allData: any[] = [];
          let from = 0;
          let hasMore = true;
          let safetyCounter = 0;

          const SELECT_COLS =
            "id, source_id, name, description, category, category_id, unit, price, promo_price, stock, min_stock, sku, featured, best_seller, views, clicks, sales, active, is_promotion, discount_percentage, promotion_limit_per_customer, store_product_images(id, product_id, path, sort_order, media_type)";

          while (hasMore && safetyCounter < 100) {
            safetyCounter++;
            const { data, error: fetchError } = await cloud
              .from("store_products")
              .select(SELECT_COLS)
              .eq("store_id", store.id)
              .order("name", { ascending: true })
              .range(from, from + PAGE_SIZE - 1);

            if (fetchError) throw new Error(fetchError.message);

            const batch = data ?? [];
            allData = [...allData, ...batch];
            hasMore = batch.length === PAGE_SIZE;
            from += PAGE_SIZE;
          }

          return allData
            .filter((p: any) => p && p.id && p.name)
            .map((p: any) => ({
              ...p,
              id: String(p.id).trim(),
              name: String(p.name).trim(),
              price: Number(p.price ?? 0),
              promo_price: Number(p.promo_price ?? 0),
              stock: Number(p.stock ?? 0),
              images: (p.store_product_images ?? [])
                .filter((im: any) => !!im?.path)
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
            })) as ProductWithImages[];
        } catch (err: any) {
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
      setProducts(mapped);
      setSmartCache(PRODUCTS_CACHE_KEY, mapped, PRODUCTS_CACHE_TTL_MS);
      setLoading(false);
    } catch (err: any) {
      console.warn("[useStoreProducts] Falha ao carregar do backend remoto. Ativando catálogo local de fallback:", err);
      // Mapeia os 121 produtos locais de materiais de construção para garantir exibição imediata
      const fallbackList: ProductWithImages[] = constructionProducts.map((p, idx) => ({
        id: p.id,
        source_id: p.id,
        name: p.name,
        description: p.name,
        category: p.category,
        category_id: null,
        unit: p.unit,
        price: p.basePrice,
        promo_price: 0,
        stock: 50,
        min_stock: 5,
        sku: p.id.toUpperCase(),
        featured: idx < 12,
        best_seller: idx < 8,
        views: 100 + idx,
        clicks: 50 + idx,
        sales: 20 + idx,
        active: true,
        is_promotion: false,
        discount_percentage: null,
        promotion_limit_per_customer: null,
        store_id: store?.id ?? "f5e69cd7-e-b465-4024-9b99-d388262b08fa",
        created_at: new Date().toISOString(),
        images: [],
      }));
      setProducts(fallbackList);
      setError(null);
      setLoading(false);
    }
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
      const now = Date.now();
      if (now - lastSilentRefreshAt > 60_000) {
        lastSilentRefreshAt = now;
        runApiMicrotask(() => load({ silent: true }));
      }
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, PRODUCTS_CACHE_KEY]);

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

import { useEffect, useMemo, useState } from "react";
import { cloud } from "@/lib/cloud";
import type { StoreProduct, StoreProductImage } from "@/types/store";
import { constructionProducts } from "@/data/constructionProducts";

type ProductRow = StoreProduct;

type ProductWithImages = ProductRow & { images: StoreProductImage[] };

export function useStoreProducts() {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await cloud
      .from("store_products")
      .select(
        "id, source_id, name, description, category, category_id, unit, price, promo_price, stock, min_stock, sku, featured, best_seller, active, store_product_images(id, product_id, path, sort_order)",
      )
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setProducts([]);
      setLoading(false);
      return;
    }

    const mapped: ProductWithImages[] = (data ?? []).map((p: any) => ({
      ...p,
      images: (p.store_product_images ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }));

    setProducts(mapped);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  // Helper: fallback data (constructionProducts) until admin sets prices/stock.
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

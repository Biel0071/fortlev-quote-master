import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud";

export type ProductRatingSummaryValue = {
  avg: number;
  total: number;
};

const ratingCache = new Map<string, ProductRatingSummaryValue | null>();

export function useProductRatingSummary(productId?: string | null) {
  const [rating, setRating] = useState<ProductRatingSummaryValue | null>(() => {
    if (!productId) return null;
    return ratingCache.get(productId) ?? null;
  });

  useEffect(() => {
    if (!productId) {
      setRating(null);
      return;
    }

    const cached = ratingCache.get(productId);
    if (cached !== undefined) {
      setRating(cached);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const { data } = await cloud
          .from("product_rating_summary")
          .select("average_rating, total_reviews")
          .eq("product_id", productId)
          .maybeSingle();

        if (!alive) return;

        const row = data as { average_rating?: number | null; total_reviews?: number | null } | null;
        const next = row && Number(row.total_reviews ?? 0) > 0
          ? {
              avg: Number(row.average_rating ?? 0),
              total: Number(row.total_reviews ?? 0),
            }
          : null;

        ratingCache.set(productId, next);
        setRating(next);
      } catch {
        if (!alive) return;
        ratingCache.set(productId, null);
        setRating(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [productId]);

  return rating;
}
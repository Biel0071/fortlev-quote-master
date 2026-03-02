import { useMemo } from "react";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";

export type ResolvedCartLine = {
  productId: string;
  quantity: number;
  product: any | null;
  name: string;
  unit: string;
  effectivePrice: number;
  lineTotal: number;
  imagePath: string | null;
  hasPrice: boolean;
};

export function useCartDetails() {
  const cart = useCart();
  const { activeProducts, loading } = useStoreProducts();

  const lines = useMemo<ResolvedCartLine[]>(() => {
    return cart.lines.map((line) => {
      const product = activeProducts.find((item) => item.id === line.productId) ?? null;
      const basePrice = Number((product as any)?.price ?? line.snapshot?.unitPrice ?? 0);
      const promoPrice = Number((product as any)?.promo_price ?? 0);
      const effectivePrice = promoPrice > 0 && promoPrice < basePrice ? promoPrice : basePrice;

      return {
        productId: line.productId,
        quantity: line.quantity,
        product,
        name: String((product as any)?.name ?? line.snapshot?.name ?? "Produto"),
        unit: String((product as any)?.unit ?? line.snapshot?.unit ?? "un"),
        effectivePrice,
        lineTotal: Math.max(0, effectivePrice * line.quantity),
        imagePath: ((product as any)?.images?.[0]?.path as string | null | undefined) ?? line.snapshot?.imagePath ?? null,
        hasPrice: Number.isFinite(effectivePrice) && effectivePrice > 0,
      };
    });
  }, [cart.lines, activeProducts]);

  const subtotal = useMemo(() => lines.reduce((acc, line) => acc + line.lineTotal, 0), [lines]);

  return {
    cart,
    lines,
    subtotal,
    productsLoading: loading,
  };
}

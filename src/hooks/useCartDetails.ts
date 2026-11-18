import { useMemo } from "react";
import { useCart } from "@/hooks/useCart";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { resolveVerifiedCartPrice } from "@/modules/catalog/cartPrice";

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
  isVerified: boolean;
};

export function useCartDetails() {
  const cart = useCart();
  const { activeProducts, loading, error } = useStoreProducts();

  const lines = useMemo<ResolvedCartLine[]>(() => {
    return cart.lines.map((line) => {
      const product = activeProducts.find((item) => item.id === line.productId) ?? null;
      const isVerified = product !== null;
      const effectivePrice = resolveVerifiedCartPrice(product) ?? 0;

      return {
        productId: line.productId,
        quantity: line.quantity,
        product,
        name: String((product as any)?.name ?? line.snapshot?.name ?? "Produto"),
        unit: String((product as any)?.unit ?? line.snapshot?.unit ?? "un"),
        effectivePrice,
        lineTotal: Math.max(0, effectivePrice * line.quantity),
        imagePath: isVerified ? ((product as any)?.images?.[0]?.path as string | null | undefined) ?? null : null,
        hasPrice: isVerified && effectivePrice > 0,
        isVerified,
      };
    });
  }, [cart.lines, activeProducts]);

  const subtotal = useMemo(() => lines.reduce((acc, line) => acc + line.lineTotal, 0), [lines]);

  return {
    cart,
    lines,
    subtotal,
    productsLoading: loading,
    productsError: error,
    canCheckout: !loading && !error && lines.every((line) => line.isVerified && line.hasPrice),
  };
}

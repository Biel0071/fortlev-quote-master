import { useEffect, useMemo, useState } from "react";

export type CartLine = {
  productId: string;
  quantity: number;
};

const STORAGE_KEY = "store-cart";
const COUPON_KEY = "store-coupon";

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  const [couponCode, setCouponCode] = useState<string>(() => localStorage.getItem(COUPON_KEY) ?? "");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    localStorage.setItem(COUPON_KEY, couponCode);
  }, [couponCode]);

  const add = (productId: string, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { productId, quantity }];
    });
  };

  const setQty = (productId: string, quantity: number) => {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)).filter((l) => l.quantity > 0));
  };

  const remove = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const clear = () => {
    setLines([]);
    setCouponCode("");
  };

  const totalItems = useMemo(() => lines.reduce((acc, l) => acc + l.quantity, 0), [lines]);

  return { lines, add, setQty, remove, clear, totalItems, couponCode, setCouponCode };
}

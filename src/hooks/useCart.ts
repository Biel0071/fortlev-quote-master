import { useEffect, useMemo, useState } from "react";

export type CartLine = {
  productId: string;
  quantity: number;
};

const STORAGE_KEY = "store-cart";

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

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

  const clear = () => setLines([]);

  const totalItems = useMemo(() => lines.reduce((acc, l) => acc + l.quantity, 0), [lines]);

  return { lines, add, setQty, remove, clear, totalItems };
}

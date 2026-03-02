import { useCallback, useMemo, useSyncExternalStore } from "react";

export type CartProductSnapshot = {
  name: string;
  unitPrice: number;
  unit?: string | null;
  imagePath?: string | null;
};

export type CartLine = {
  productId: string;
  quantity: number;
  snapshot?: CartProductSnapshot;
};

type CartState = {
  lines: CartLine[];
  couponCode: string;
};

const STORAGE_KEY = "store-cart";
const COUPON_KEY = "store-coupon";

const listeners = new Set<() => void>();

const parseLines = (raw: string | null): CartLine[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        const productId = String(item?.productId ?? "").trim();
        const quantity = Math.max(0, Math.trunc(Number(item?.quantity ?? 0)));
        if (!productId || quantity <= 0) return null;

        const snapshot = item?.snapshot
          ? {
              name: String(item.snapshot?.name ?? "Produto").slice(0, 180),
              unitPrice: Number(item.snapshot?.unitPrice ?? 0),
              unit: item.snapshot?.unit ? String(item.snapshot.unit).slice(0, 20) : undefined,
              imagePath: item.snapshot?.imagePath ? String(item.snapshot.imagePath) : undefined,
            }
          : undefined;

        return { productId, quantity, snapshot } satisfies CartLine;
      })
      .filter(Boolean) as CartLine[];
  } catch {
    return [];
  }
};

const readInitialState = (): CartState => {
  if (typeof window === "undefined") {
    return { lines: [], couponCode: "" };
  }

  return {
    lines: parseLines(window.localStorage.getItem(STORAGE_KEY)),
    couponCode: window.localStorage.getItem(COUPON_KEY) ?? "",
  };
};

let cartState: CartState = readInitialState();
let listeningStorage = false;

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const persistState = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartState.lines));
  window.localStorage.setItem(COUPON_KEY, cartState.couponCode);
};

const setCartState = (updater: (prev: CartState) => CartState) => {
  cartState = updater(cartState);
  persistState();
  emitChange();
};

const ensureStorageSync = () => {
  if (typeof window === "undefined" || listeningStorage) return;
  listeningStorage = true;

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== COUPON_KEY) return;

    cartState = {
      lines: parseLines(window.localStorage.getItem(STORAGE_KEY)),
      couponCode: window.localStorage.getItem(COUPON_KEY) ?? "",
    };
    emitChange();
  });
};

const subscribe = (listener: () => void) => {
  ensureStorageSync();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => cartState;

export function useCart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const add = useCallback((productId: string, quantity = 1, snapshot?: CartProductSnapshot) => {
    const cleanId = String(productId ?? "").trim();
    const qty = Math.max(0, Math.trunc(Number(quantity)));
    if (!cleanId || qty <= 0) return;

    setCartState((prev) => {
      const existing = prev.lines.find((line) => line.productId === cleanId);

      if (existing) {
        return {
          ...prev,
          lines: prev.lines.map((line) =>
            line.productId === cleanId
              ? {
                  ...line,
                  quantity: line.quantity + qty,
                  snapshot: snapshot ?? line.snapshot,
                }
              : line,
          ),
        };
      }

      return {
        ...prev,
        lines: [...prev.lines, { productId: cleanId, quantity: qty, snapshot }],
      };
    });
  }, []);

  const setQty = useCallback((productId: string, quantity: number) => {
    const cleanId = String(productId ?? "").trim();
    const qty = Math.max(0, Math.trunc(Number(quantity)));
    if (!cleanId) return;

    setCartState((prev) => ({
      ...prev,
      lines: prev.lines
        .map((line) => (line.productId === cleanId ? { ...line, quantity: qty } : line))
        .filter((line) => line.quantity > 0),
    }));
  }, []);

  const remove = useCallback((productId: string) => {
    const cleanId = String(productId ?? "").trim();
    if (!cleanId) return;

    setCartState((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.productId !== cleanId),
    }));
  }, []);

  const clear = useCallback(() => {
    setCartState((prev) => ({ ...prev, lines: [], couponCode: "" }));
  }, []);

  const setCouponCode = useCallback((couponCode: string) => {
    setCartState((prev) => ({ ...prev, couponCode: String(couponCode ?? "") }));
  }, []);

  const totalItems = useMemo(() => state.lines.reduce((acc, line) => acc + line.quantity, 0), [state.lines]);

  return {
    lines: state.lines,
    add,
    setQty,
    remove,
    clear,
    totalItems,
    couponCode: state.couponCode,
    setCouponCode,
  };
}


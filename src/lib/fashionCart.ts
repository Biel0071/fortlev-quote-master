export type FashionCartLine = {
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  colorHex: string;
  gradient: string;
  qty: number;
};

const KEY = "fashion:cart:v1";

export function loadFashionCart(): FashionCartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FashionCartLine[]) : [];
  } catch {
    return [];
  }
}

export function saveFashionCart(lines: FashionCartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
    window.dispatchEvent(new CustomEvent("fashion-cart-change"));
  } catch {
    /* ignore */
  }
}

export function clearFashionCart() {
  saveFashionCart([]);
}

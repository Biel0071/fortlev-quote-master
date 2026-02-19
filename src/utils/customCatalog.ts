import type { Product } from "@/types/quotation";
import type { ConstructionProduct } from "@/types/construction";

const FORTLEV_CUSTOM_KEY = "custom-catalog-fortlev";
const CONSTRUCTION_CUSTOM_KEY = "custom-catalog-construction";

type Stored<T> = {
  items: T[];
  updatedAt: string;
};

function readStored<T>(key: string): Stored<T> {
  const raw = localStorage.getItem(key);
  if (!raw) return { items: [], updatedAt: new Date().toISOString() };
  try {
    const parsed = JSON.parse(raw) as Stored<T>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

function writeStored<T>(key: string, items: T[]) {
  const payload: Stored<T> = { items, updatedAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(payload));
}

export function getCustomFortlevProducts(): Product[] {
  return readStored<Product>(FORTLEV_CUSTOM_KEY).items;
}

export function addCustomFortlevProduct(p: Product): Product[] {
  const current = getCustomFortlevProducts();
  const next = [p, ...current.filter((x) => x.id !== p.id)];
  writeStored<Product>(FORTLEV_CUSTOM_KEY, next);
  return next;
}

export function getCustomConstructionProducts(): ConstructionProduct[] {
  return readStored<ConstructionProduct>(CONSTRUCTION_CUSTOM_KEY).items;
}

export function addCustomConstructionProduct(p: ConstructionProduct): ConstructionProduct[] {
  const current = getCustomConstructionProducts();
  const next = [p, ...current.filter((x) => x.id !== p.id)];
  writeStored<ConstructionProduct>(CONSTRUCTION_CUSTOM_KEY, next);
  return next;
}

import { useMemo, useState } from "react";

export type StoreKey = "fortlev" | "construcao";

export type SaleRecord = {
  id: string;
  store: StoreKey;
  quotationId: string;
  value: number;
  soldAt: Date;
  notes?: string;
};

const storageKeyForStore = (store: StoreKey) => `store-sales-${store}`;

function reviveDates(records: any[]): SaleRecord[] {
  return (records ?? []).map((r) => ({
    ...r,
    soldAt: r.soldAt ? new Date(r.soldAt) : new Date(),
  }));
}

export function useSales(store: StoreKey) {
  const [sales, setSales] = useState<SaleRecord[]>(() => {
    const raw = localStorage.getItem(storageKeyForStore(store));
    if (!raw) return [];
    try {
      return reviveDates(JSON.parse(raw));
    } catch {
      return [];
    }
  });

  const persist = (next: SaleRecord[]) => {
    setSales(next);
    localStorage.setItem(storageKeyForStore(store), JSON.stringify(next));
  };

  const createSale = (input: Omit<SaleRecord, "id">) => {
    const record: SaleRecord = { ...input, id: crypto.randomUUID() };
    persist([record, ...sales]);
    return record;
  };

  const deleteSale = (id: string) => {
    persist(sales.filter((s) => s.id !== id));
  };

  const updateSale = (id: string, updates: Partial<SaleRecord>) => {
    persist(
      sales.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const salesByQuotationId = useMemo(() => {
    const map = new Map<string, SaleRecord[]>();
    for (const s of sales) {
      const list = map.get(s.quotationId) ?? [];
      list.push(s);
      map.set(s.quotationId, list);
    }
    return map;
  }, [sales]);

  return { sales, salesByQuotationId, createSale, deleteSale, updateSale };
}

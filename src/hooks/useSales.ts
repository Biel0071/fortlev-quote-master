import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type StoreKey = "fortlev" | "construcao";

export type SaleRecord = {
  id: string;
  store: StoreKey;
  quotationId: string;
  value: number;
  soldAt: Date;
  notes?: string;
};

function rowToSale(row: any): SaleRecord {
  return {
    id: row.id,
    store: row.store as StoreKey,
    quotationId: row.quotation_id,
    value: Number(row.value),
    soldAt: new Date(row.sold_at),
    notes: row.notes,
  };
}

export function useSales(store: StoreKey) {
  const [sales, setSales] = useState<SaleRecord[]>([]);

  const fetchSales = useCallback(async () => {
    const { data, error } = await supabase
      .from('sales_records')
      .select('*')
      .eq('store', store)
      .order('sold_at', { ascending: false });
    if (error) {
      console.error('Error fetching sales:', error);
      return;
    }
    setSales((data ?? []).map(rowToSale));
  }, [store]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const createSale = async (input: Omit<SaleRecord, "id">) => {
    const row = {
      store: input.store,
      quotation_id: input.quotationId,
      value: input.value,
      sold_at: input.soldAt instanceof Date ? input.soldAt.toISOString() : input.soldAt,
      notes: input.notes ?? null,
    };
    const { data, error } = await supabase.from('sales_records').insert(row as any).select('*').single();
    if (error) {
      console.error('Error creating sale:', error);
      toast({ title: 'Erro ao registrar venda', description: error.message, variant: 'destructive' });
      return;
    }
    if (data) {
      setSales((prev) => [rowToSale(data), ...prev]);
    }
  };

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from('sales_records').delete().eq('id', id);
    if (error) {
      console.error('Error deleting sale:', error);
      return;
    }
    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSale = async (id: string, updates: Partial<SaleRecord>) => {
    const row: Record<string, any> = {};
    if (updates.value !== undefined) row.value = updates.value;
    if (updates.notes !== undefined) row.notes = updates.notes;
    if (updates.soldAt !== undefined) row.sold_at = updates.soldAt instanceof Date ? updates.soldAt.toISOString() : updates.soldAt;

    const { error } = await supabase.from('sales_records').update(row).eq('id', id);
    if (error) {
      console.error('Error updating sale:', error);
      return;
    }
    setSales((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
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

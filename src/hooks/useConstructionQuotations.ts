import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ConstructionQuotation } from "@/types/construction";
import { toast } from "@/hooks/use-toast";

function rowToQuotation(row: any): ConstructionQuotation {
  return {
    id: row.id,
    number: row.number,
    customer: row.customer_json as ConstructionQuotation['customer'],
    companyInfo: row.company_info_json as ConstructionQuotation['companyInfo'],
    items: row.items_json as ConstructionQuotation['items'],
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    freight: Number(row.freight),
    total: Number(row.total),
    validity: row.validity,
    observations: row.observations,
    paymentMethod: row.payment_method,
    deliveryDate: row.delivery_date,
    showClientData: row.show_client_data,
    createdAt: new Date(row.created_at),
    status: row.status as ConstructionQuotation['status'],
  };
}

function quotationToRow(q: ConstructionQuotation) {
  return {
    id: q.id,
    number: q.number,
    customer_json: q.customer as any,
    company_info_json: q.companyInfo as any,
    items_json: q.items as any,
    subtotal: q.subtotal,
    discount: q.discount,
    freight: q.freight,
    total: q.total,
    validity: q.validity,
    observations: q.observations,
    payment_method: q.paymentMethod,
    delivery_date: q.deliveryDate,
    show_client_data: q.showClientData,
    status: q.status,
    created_at: q.createdAt instanceof Date ? q.createdAt.toISOString() : q.createdAt,
  };
}

export function useConstructionQuotations() {
  const [quotations, setQuotations] = useState<ConstructionQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = useCallback(async () => {
    const { data, error } = await supabase
      .from('construction_quotations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching construction quotations:', error);
      return;
    }
    setQuotations((data ?? []).map(rowToQuotation));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const saveQuotation = async (quotation: ConstructionQuotation) => {
    const row = quotationToRow(quotation);
    const { error } = await supabase.from('construction_quotations').insert(row as any);
    if (error) {
      console.error('Error saving quotation:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    setQuotations((prev) => [quotation, ...prev]);
  };

  const updateQuotation = async (id: string, updates: Partial<ConstructionQuotation>) => {
    const existing = quotations.find((q) => q.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    const row = quotationToRow(merged);
    const { id: _id, ...rest } = row;
    const { error } = await supabase.from('construction_quotations').update(rest as any).eq('id', id);
    if (error) {
      console.error('Error updating quotation:', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return;
    }
    setQuotations((prev) => prev.map((q) => (q.id === id ? merged : q)));
  };

  const deleteQuotation = async (id: string) => {
    const { error } = await supabase.from('construction_quotations').delete().eq('id', id);
    if (error) {
      console.error('Error deleting quotation:', error);
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    setQuotations((prev) => prev.filter((q) => q.id !== id));
  };

  const duplicateQuotation = async (id: string) => {
    const original = quotations.find((q) => q.id === id);
    if (!original) return;
    const newQ: ConstructionQuotation = {
      ...original,
      id: crypto.randomUUID(),
      number: generateQuotationNumber(),
      createdAt: new Date(),
      status: 'pending',
    };
    await saveQuotation(newQ);
    toast({ title: 'Orçamento duplicado', description: `Novo orçamento ${newQ.number} criado` });
  };

  const generateQuotationNumber = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return {
    quotations,
    loading,
    saveQuotation,
    updateQuotation,
    deleteQuotation,
    duplicateQuotation,
    generateQuotationNumber,
  };
}

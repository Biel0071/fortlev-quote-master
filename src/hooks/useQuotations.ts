import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Quotation } from '@/types/quotation';
import { toast } from '@/hooks/use-toast';

function rowToQuotation(row: any): Quotation {
  return {
    id: row.id,
    companyId: row.company_id,
    leadId: row.lead_id,
    isOrder: row.is_order,
    number: row.number,
    customer: row.customer_json as Quotation['customer'],
    companyInfo: row.company_info_json as Quotation['companyInfo'],
    items: row.items_json as Quotation['items'],
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    freight: Number(row.freight),
    total: Number(row.total),
    taxes: row.taxes_json as Quotation['taxes'],
    validity: row.validity,
    observations: row.observations,
    paymentConditions: row.payment_conditions_json as Quotation['paymentConditions'],
    deliveryTime: row.delivery_time,
    showClientData: row.show_client_data,
    createdAt: new Date(row.created_at),
    status: row.status as Quotation['status'],
    branding: row.branding_json as Quotation['branding'],
    fiscal: row.fiscal_status ? {
      status: row.fiscal_status,
      accessKey: row.access_key,
      invoiceNumber: row.invoice_number,
      series: row.series,
      protocol: row.protocol,
      emissionAt: row.emission_at ? new Date(row.emission_at) : undefined,
      receiptAt: row.receipt_at ? new Date(row.receipt_at) : undefined,
      cStat: row.c_stat,
      xmlContent: row.xml_content,
      xmlHash: row.xml_hash,
      portalToken: row.portal_token
    } : undefined
  };
}

function quotationToRow(q: Quotation) {
  return {
    id: q.id,
    company_id: q.companyId,
    lead_id: q.leadId,
    is_order: q.isOrder,
    number: q.number,
    customer_json: q.customer as any,
    company_info_json: q.companyInfo as any,
    items_json: q.items as any,
    subtotal: q.subtotal,
    discount: q.discount,
    freight: q.freight,
    total: q.total,
    taxes_json: q.taxes as any ?? null,
    validity: q.validity,
    observations: q.observations,
    payment_conditions_json: q.paymentConditions as any,
    delivery_time: q.deliveryTime,
    show_client_data: q.showClientData,
    status: q.status,
    branding_json: q.branding as any ?? null,
    created_at: q.createdAt instanceof Date ? q.createdAt.toISOString() : q.createdAt,
    fiscal_status: q.fiscal?.status,
    access_key: q.fiscal?.accessKey,
    invoice_number: q.fiscal?.invoiceNumber,
    series: q.fiscal?.series,
    protocol: q.fiscal?.protocol,
    emission_at: q.fiscal?.emissionAt instanceof Date ? q.fiscal.emissionAt.toISOString() : q.fiscal?.emissionAt,
    receipt_at: q.fiscal?.receiptAt instanceof Date ? q.fiscal.receiptAt.toISOString() : q.fiscal?.receiptAt,
    c_stat: q.fiscal?.cStat,
    xml_content: q.fiscal?.xmlContent,
    xml_hash: q.fiscal?.xmlHash,
    portal_token: q.fiscal?.portalToken
  };
}

export const useQuotations = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = useCallback(async () => {
    const { data, error } = await supabase
      .from('fortlev_quotations')
      .select('*, store_id')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching quotations:', error);
      return;
    }
    setQuotations((data ?? []).map(rowToQuotation));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const saveQuotation = async (quotation: Quotation) => {
    const row = quotationToRow(quotation);
    const { error } = await supabase.from('fortlev_quotations').insert(row as any);
    if (error) {
      console.error('Error saving quotation:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    setQuotations((prev) => [quotation, ...prev]);
  };

  const updateQuotation = async (id: string, updates: Partial<Quotation>) => {
    const existing = quotations.find((q) => q.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    const row = quotationToRow(merged);
    const { id: _id, ...rest } = row;
    const { error } = await supabase.from('fortlev_quotations').update(rest as any).eq('id', id);
    if (error) {
      console.error('Error updating quotation:', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return;
    }
    setQuotations((prev) => prev.map((q) => (q.id === id ? merged : q)));
  };

  const deleteQuotation = async (id: string) => {
    const { error } = await supabase.from('fortlev_quotations').delete().eq('id', id);
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
    const newQ: Quotation = {
      ...original,
      id: crypto.randomUUID(),
      number: generateQuotationNumber(),
      createdAt: new Date(),
      status: 'pending',
      fiscal: undefined, // Don't duplicate fiscal info
    };
    await saveQuotation(newQ);
    toast({ title: 'Orçamento duplicado', description: `Novo orçamento ${newQ.number} criado` });
  };

  const generateQuotationNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
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
    refetchQuotations: fetchQuotations,
  };
};


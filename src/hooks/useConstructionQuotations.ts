import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ConstructionCategory, ConstructionProduct, ConstructionQuotation, ConstructionQuotationItem } from "@/types/construction";
import { toast } from "@/hooks/use-toast";

const VALID_UNITS: ConstructionProduct["unit"][] = ["un", "kg", "m", "m²", "m³", "pç", "cx", "sc", "br", "rl"];
const VALID_CATEGORIES: ConstructionCategory[] = [
  "agregados",
  "cimentos",
  "blocos-tijolos",
  "telhas",
  "hidraulica",
  "eletrica",
  "ferramentas",
  "acabamentos",
  "estruturas",
  "madeiras",
  "churrasqueiras",
  "pisos-revestimentos",
  "pintura",
  "metais-loucas",
  "ferragens",
  "outros",
];

function toNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const normalized = value.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeUnit(value: unknown): ConstructionProduct["unit"] {
  const raw = text(value).toLowerCase().replace("m2", "m²").replace("m3", "m³");
  if (VALID_UNITS.includes(raw as ConstructionProduct["unit"])) return raw as ConstructionProduct["unit"];
  if (["und", "unid", "unidade"].includes(raw)) return "un";
  if (["peca", "peça"].includes(raw)) return "pç";
  if (["caixa"].includes(raw)) return "cx";
  if (["saco"].includes(raw)) return "sc";
  if (["barra"].includes(raw)) return "br";
  if (["rolo"].includes(raw)) return "rl";
  return "un";
}

function normalizeCategory(value: unknown): ConstructionCategory {
  const raw = text(value).toLowerCase();
  if (VALID_CATEGORIES.includes(raw as ConstructionCategory)) return raw as ConstructionCategory;
  if (raw.includes("piso") || raw.includes("revest")) return "pisos-revestimentos";
  if (raw.includes("tinta") || raw.includes("pint")) return "pintura";
  if (raw.includes("cimento") || raw.includes("argamassa")) return "cimentos";
  if (raw.includes("hid")) return "hidraulica";
  if (raw.includes("el")) return "eletrica";
  return "outros";
}

function normalizeItem(raw: any, index: number): ConstructionQuotationItem {
  const rawProduct = raw?.product && typeof raw.product === "object" ? raw.product : {};
  const quantity = Math.max(0, toNumber(raw?.quantity, raw?.qty, raw?.qtd, raw?.quantidade, 1) || 1);
  const inferredUnitPrice = quantity > 0 ? toNumber(raw?.subtotal, raw?.total, raw?.line_total) / quantity : 0;
  const unitPrice = toNumber(raw?.unitPrice, raw?.unit_price, raw?.price, raw?.preco, raw?.valor_unitario, rawProduct?.basePrice, rawProduct?.base_price, inferredUnitPrice);
  const subtotal = toNumber(raw?.subtotal, raw?.total, raw?.line_total, unitPrice * quantity);
  const name = text(rawProduct?.name, raw?.productName, raw?.product_name, raw?.name, raw?.description, raw?.item, `Item ${index + 1}`);
  const productId = text(rawProduct?.id, raw?.productId, raw?.product_id) || `manual-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`;

  return {
    id: text(raw?.id, raw?.item_id) || `${productId}-${index}`,
    product: {
      id: productId,
      name,
      description: text(rawProduct?.description, raw?.description) || undefined,
      unit: normalizeUnit(rawProduct?.unit ?? raw?.unit ?? raw?.unidade),
      basePrice: toNumber(rawProduct?.basePrice, rawProduct?.base_price, raw?.basePrice, raw?.base_price, unitPrice),
      category: normalizeCategory(rawProduct?.category ?? raw?.category ?? raw?.categoria),
    },
    quantity,
    unitPrice,
    subtotal,
    discount: toNumber(raw?.discount, raw?.desconto) || undefined,
  };
}

function normalizeItems(value: unknown): ConstructionQuotationItem[] {
  return Array.isArray(value) ? value.map(normalizeItem) : [];
}

function normalizeCustomer(raw: any): ConstructionQuotation["customer"] {
  const delivery = raw?.delivery ?? raw?.entrega ?? {};
  const address = text(
    raw?.address,
    raw?.endereco,
    delivery?.address,
    delivery?.endereco,
    [delivery?.city ?? raw?.city ?? raw?.cidade, delivery?.state ?? raw?.state ?? raw?.estado, delivery?.cep ?? raw?.cep].filter(Boolean).join(" - "),
  );

  return {
    name: text(raw?.name, raw?.nome, raw?.customerName, raw?.customer_name, "Cliente"),
    cpfCnpj: text(raw?.cpfCnpj, raw?.cnpj, raw?.cpf, raw?.document, raw?.documento),
    phone: text(raw?.phone, raw?.telefone, raw?.whatsapp),
    address,
    email: text(raw?.email) || undefined,
  };
}

function normalizeCompany(raw: any): ConstructionQuotation["companyInfo"] {
  return {
    name: text(raw?.name, raw?.nome, "MF atacadista"),
    cnpj: text(raw?.cnpj),
    ie: text(raw?.ie, raw?.stateRegistration),
    address: text(raw?.address, raw?.endereco),
    phone: text(raw?.phone, raw?.telefone),
    email: text(raw?.email),
    sellerName: text(raw?.sellerName, raw?.seller_name, raw?.vendedor),
  };
}

function normalizeStatus(value: unknown): ConstructionQuotation["status"] {
  return value === "sent" || value === "approved" || value === "rejected" ? value : "pending";
}

function rowToQuotation(row: any): ConstructionQuotation {
  const items = normalizeItems(row.items_json);
  const subtotal = toNumber(row.subtotal, items.reduce((acc, item) => acc + item.subtotal, 0));
  const discount = toNumber(row.discount);
  const freight = toNumber(row.freight, row.shipping);
  return {
    id: row.id,
    number: text(row.number, row.id?.slice?.(0, 8)?.toUpperCase?.()),
    customer: normalizeCustomer(row.customer_json ?? {}),
    companyInfo: normalizeCompany(row.company_info_json ?? {}),
    items,
    subtotal,
    discount,
    freight,
    total: toNumber(row.total, subtotal - discount + freight),
    validity: text(row.validity, "5 dias"),
    observations: text(row.observations),
    paymentMethod: text(row.payment_method, "PIX"),
    deliveryDate: text(row.delivery_date),
    showClientData: row.show_client_data !== false,
    createdAt: new Date(row.created_at),
    status: normalizeStatus(row.status),
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

function quotationToRow(q: ConstructionQuotation) {
  const items = normalizeItems(q.items);
  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const discount = toNumber(q.discount);
  const freight = toNumber(q.freight);
  return {
    id: q.id,
    number: q.number,
    customer_json: normalizeCustomer(q.customer) as any,
    company_info_json: normalizeCompany(q.companyInfo) as any,
    items_json: items as any,
    subtotal,
    discount,
    freight,
    total: toNumber(q.total, subtotal - discount + freight),
    validity: q.validity,
    observations: q.observations,
    payment_method: q.paymentMethod,
    delivery_date: q.deliveryDate,
    show_client_data: q.showClientData,
    status: normalizeStatus(q.status),
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
      fiscal: undefined,
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
    refetchQuotations: fetchQuotations,
  };
}


import type { TrackingOrderItem } from "@/components/store/tracking/TrackingCustomerCard";
import { cloud } from "@/lib/cloud";

export interface RawTrackingItemInput {
  product_name?: string;
  name_snapshot?: string;
  name?: string;
  productName?: string;
  description?: string;
  unit?: string | null;
  unit_snapshot?: string | null;
  quantity?: number | string;
  unit_price?: number | string | null;
  price_snapshot?: number | string | null;
  unitPrice?: number | string | null;
  price?: number | string | null;
  line_total?: number | string | null;
  subtotal?: number | string | null;
  total?: number | string | null;
  product?: {
    name?: string | null;
    unit?: string | null;
    basePrice?: number | null;
  } | null;
}

export function formatCpfCnpj(digits: string): string {
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return digits;
}

export function normalizeTrackingItems(rawItems: RawTrackingItemInput[]): TrackingOrderItem[] {
  return (rawItems || []).map((item) => {
    const qty = Math.max(1, Number(item.quantity || 1));
    const unit = item.unit || item.unit_snapshot || item.product?.unit || null;
    const unitPrice = Number(
      item.unit_price ??
        item.price_snapshot ??
        item.unitPrice ??
        item.price ??
        item.product?.basePrice ??
        0
    );
    const lineTotal = Number(
      item.line_total ?? item.subtotal ?? item.total ?? unitPrice * qty
    );
    return {
      product_name:
        item.product_name ||
        item.name_snapshot ||
        item.product?.name ||
        item.name ||
        item.productName ||
        item.description ||
        "Material",
      unit,
      quantity: qty,
      unit_price: unitPrice > 0 ? unitPrice : lineTotal > 0 ? lineTotal / qty : 0,
      line_total: lineTotal > 0 ? lineTotal : unitPrice * qty,
    };
  });
}

export async function resolveTrackingItemsAndTotal(params: {
  orderItems?: RawTrackingItemInput[] | null;
  customItems?: RawTrackingItemInput[] | null;
  orderTotal?: number | null;
  customTotal?: number | null;
  customerCpf?: string | null;
}): Promise<{ items: TrackingOrderItem[]; total: number }> {
  const orderItems = params.orderItems || [];
  const customItems = params.customItems || [];
  const rawItems = orderItems.length > 0 ? orderItems : customItems;

  let items = normalizeTrackingItems(rawItems);
  let total = Number(params.orderTotal || params.customTotal || 0);

  const customerCpf = (params.customerCpf || "").replace(/\D/g, "");
  if ((items.length === 0 || total <= 0) && customerCpf) {
    try {
      const formattedDoc = formatCpfCnpj(customerCpf);
      const docFilter = [
        `customer_json->>document.eq.${customerCpf}`,
        `customer_json->>document.eq.${formattedDoc}`,
        `customer_json->>cpfCnpj.eq.${customerCpf}`,
        `customer_json->>cpfCnpj.eq.${formattedDoc}`,
        `customer_json->>cnpj.eq.${customerCpf}`,
        `customer_json->>cnpj.eq.${formattedDoc}`,
        `customer_json->>cpf.eq.${customerCpf}`,
        `customer_json->>cpf.eq.${formattedDoc}`,
      ].join(",");

      const [fRes, cRes] = await Promise.all([
        cloud
          .from("fortlev_quotations")
          .select("total, items_json")
          .or(docFilter)
          .order("created_at", { ascending: false })
          .limit(1),
        cloud
          .from("construction_quotations")
          .select("total, items_json")
          .or(docFilter)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      const quote = (fRes.data && fRes.data[0]) || (cRes.data && cRes.data[0]);
      if (quote) {
        if (total <= 0 && Number(quote.total) > 0) total = Number(quote.total);
        if (items.length === 0 && Array.isArray(quote.items_json)) {
          items = normalizeTrackingItems(quote.items_json as RawTrackingItemInput[]);
        }
      }
    } catch {
      // Fallback silently if public RLS restricts quotations
    }
  }

  return { items, total };
}

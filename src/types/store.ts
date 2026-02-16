export type StoreProduct = {
  id: string;
  source_id: string | null;
  name: string;
  description: string | null;
  /** legacy category text (kept for backwards compatibility) */
  category: string | null;
  category_id?: string | null;
  unit: string | null;
  sku?: string | null;
  price: number;
  promo_price?: number;
  stock: number;
  min_stock?: number;
  featured?: boolean;
  best_seller?: boolean;
  active: boolean;
};

export type StoreProductImage = {
  id: string;
  product_id: string;
  path: string;
  sort_order: number;
};

export type StoreOrderStatus = "pending" | "paid" | "processing" | "shipped" | "cancelled";

export type StoreOrder = {
  id: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  cep: string | null;
  address: string | null;
  notes: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  checkout_mode: string;
  payment_method: string | null;
  whatsapp_sent: boolean;
  created_at: string;
};

export type StoreOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name_snapshot: string;
  unit_snapshot: string | null;
  price_snapshot: number;
  quantity: number;
  line_total: number;
  created_at: string;
};

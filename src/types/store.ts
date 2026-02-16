export type StoreProduct = {
  id: string;
  source_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  price: number;
  stock: number;
  active: boolean;
};

export type StoreProductImage = {
  id: string;
  product_id: string;
  path: string;
  sort_order: number;
};

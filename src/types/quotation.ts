export interface Product {
  id: string;
  name: string;
  capacity: number;
  unit: string;
  height: string;
  diameter: string;
}

export interface QuotationItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
}

export interface Quotation {
  id: string;
  number: string;
  customer: Customer;
  items: QuotationItem[];
  total: number;
  validity: string;
  observations: string;
  createdAt: Date;
  status: 'pending' | 'sent' | 'approved' | 'rejected';
}

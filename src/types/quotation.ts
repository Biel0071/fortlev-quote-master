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
  cnpj: string;
  phone: string;
  address: string;
}

export interface CompanyInfo {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  sellerName: string;
  sellerRole: string;
}

export interface PaymentConditions {
  cashDiscount: string;
  installments: string;
  downPayment: string;
}

export interface Quotation {
  id: string;
  number: string;
  customer: Customer;
  companyInfo: CompanyInfo;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  total: number;
  validity: string;
  observations: string;
  paymentConditions: PaymentConditions;
  deliveryTime: string;
  showClientData: boolean;
  createdAt: Date;
  status: 'pending' | 'sent' | 'approved' | 'rejected';
}
